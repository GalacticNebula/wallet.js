import _ from 'lodash';
import cron from 'node-cron';
import { Op } from 'sequelize';
import { ethHelper, tryLock } from "@helpers/index";
import { TokenModel } from "@models/token.model";
import BaseService from "./base.service";
import {
  addressStore,
  orderStore,
  recoverStore,
  tokenStatusStore,
  tokenStore,
  userWalletStore
} from "@store/index";
import { Exception } from '@common/exceptions';
import { AddressType, Code, OrderState, OrderType, OutOrIn } from '@common/enums';
import { eth_config, ETH_CONFNIG } from '@config/eth';
import { logger, min } from '@common/utils';
import { OrderModel } from '@models/order.model';
import { RecoverModel } from '@models/recover.model';

const web3 = ethHelper.web3;
const toBN = web3.utils.toBN;

export class EthService extends BaseService {

  private deposit_lock = false;
  private confirm_lock = false;
  private withdraw_lock = false;
  private collect_lock = false;
  private token_id: number;

  constructor(private token: TokenModel, private config: ETH_CONFNIG) {
    super();
    this.token_id = _.get(token, 'id');
    this.init();
  }

  public static async create(token_id: number) {
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.SERVER_ERROR, `token ${token_id} not found`);

    return new EthService(token, eth_config);
  }

  public init() {
    const self = this;

    const timezone = 'Asia/Shanghai';
    cron.schedule('*/8 * * * * *', async () => await self.deposit(), { timezone }).start();
    cron.schedule('*/15 * * * * *', async () => await self.confirm(), { timezone }).start();
    cron.schedule('*/10 * * * * *', async () => await self.withdraw(), { timezone }).start();
    cron.schedule('6,21,36,51 * * * * *', async () => await self.collect(), { timezone }).start();
  }

  @tryLock('deposit_lock')
  public async deposit() {
    const { token_id, config } = this;
    const status = await tokenStatusStore.findByTokenId(token_id);
    if (!status)
      return;

    const gasAddress = await addressStore.find(AddressType.GAS, 'eth');
    if (!gasAddress) {
      logger.error(`eth gas address not found`);
      return;
    }

    const { step } = config;

    const blockIndex = status.block_id + 1;
    let id = await web3.eth.getBlockNumber();
    id -= 3;

    if (id < blockIndex)
      return;

    id = min([id, blockIndex + step - 1]);
    for (let i = blockIndex; i <= id; i++) {
      const block = await web3.eth.getBlock(i, true);
      const { transactions } = block;
      for (let j = 0; j < transactions.length; j++) {
        const { hash: txid, to, from, value } = transactions[j];
        const receipt = await web3.eth.getTransactionReceipt(txid);
        const status = _.get(receipt, 'status');
        if (status !== true)
          continue;

        if (!to || from == gasAddress.address)
          continue;

        const wallet = await userWalletStore.findOne({ where: { eth: to } });
        if (!wallet)
          continue;

        const exist = await orderStore.findOne({ where: { txid, token_id } });
        if (exist != null)
          continue;

        const order = await orderStore.create({
          user_id: wallet.user_id,
          token_id,
          txid,
          timestamp: block.timestamp,
          out_or_in: OutOrIn.OUT,
          type: OrderType.RECHARGE,
          count: value,
          from,
          to,
          block_number: block.number,
          state: OrderState.HASH
        });

        await this.notify(order.id);
      }
    }

    await tokenStatusStore.setBlockId(token_id, id);
  }

  private async confirmOrders() {
    const { token_id } = this;
    const orders = await orderStore.findAll({
      where: { token_id, state: [ OrderState.HASH, OrderState.WAIT_CONFIRM ] }
    });

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const { id, state, txid } = order;
      let updated = false;
      if (state == OrderState.HASH) {
        const ob = await web3.eth.getTransaction(txid);
        if (!_.isNil(ob.blockNumber)) {
          const up = await orderStore.waitConfirm(id, ob.blockNumber);
          if (!up) logger.error(`wait confirm ${id} failed`);
          updated = true;
        }
      }

      const ob = await web3.eth.getTransactionReceipt(txid);
      if (ob) {
        const { status } = ob;
        const done = await orderStore.finish(id, status);
        if (!done) logger.error(`finish ${id} ${status} failed`);
      
        updated = true;
      }

      if (updated)
        await this.notify(id);
    }
  }

  private async confirmRecovery() {
    const { token_id } = this;
    const recovers = await recoverStore.findAll({
      where: { token_id, state: [ OrderState.HASH, OrderState.WAIT_CONFIRM ] }
    });

    for (let i = 0; i < recovers.length; i++) {
      const recover = recovers[i];
      const { id, state, txid } = recover;
      if (state == OrderState.HASH) {
        const ob = await web3.eth.getTransaction(txid);
        if (!_.isNil(ob.blockNumber)) {
          const up = await recoverStore.waitConfirm(id, ob.blockNumber);
          if (!up) logger.error(`recover wait confirm ${id} failed`);
        }
      }

      const ob = await web3.eth.getTransactionReceipt(txid);
      if (!ob)
        continue;

      const { status } = ob;
      const done = await recoverStore.finish(id, status);
      if (!done) logger.error(`recover finish ${id} ${status} failed`);
    }
  }

  @tryLock('confirm_lock')
  public async confirm() {
    await this.confirmOrders();
    await this.confirmRecovery();
  }

  @tryLock('withdraw_lock')
  public async withdraw() {
    const { token_id } = this;
    const orders = await orderStore.findAll({
      where: { token_id, state: OrderState.CREATED },
      limit: 20,
      order: [['id','ASC']]
    });

    const cnt = _.size(orders);
    if (0 == cnt)
      return;

    const address = await addressStore.find(AddressType.WITHDRAW, 'eth');
    if (!address) {
      logger.error(`eth withdraw address not found`);
      return;
    }

    const { private_key } = address;
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      await this.withdrawOne(order, private_key);
    }
  }

  public async withdrawOne(order: OrderModel, privateKey: string) {
    const order_id = _.get(order, 'id');
    const { from, to, count } = order;

    const gasLimit = await web3.eth.estimateGas({ from });
    const price = await web3.eth.getGasPrice();
    const gasPrice = web3.utils.toBN(price);
    const gasFee = toBN(gasLimit).mul(gasPrice);
    const nonce = await web3.eth.getTransactionCount(from);
    const total = gasFee.add(toBN(count));

    const balance = await web3.eth.getBalance(from);
    if (toBN(balance).lt(total)) {
      logger.error(`${from} balance not enough ${balance} < ${total}`);
      return;
    }

    const signedTx = await web3.eth.accounts.signTransaction({
      gas: gasLimit,
      gasPrice: gasPrice.toString(),
      nonce,
      to,
      value: count
    }, privateKey);

    const self = this;
    try {
    const tx = await web3.eth
      .sendSignedTransaction(signedTx.rawTransaction || '')
      .on('transactionHash', async (txid: string) => {
        await orderStore.hash(order_id, txid);
        await self.notify(order_id);
      });
    } catch (e) {
      await orderStore.hashFail(order_id);
      await self.notify(order_id);
      logger.error(`order ${order_id} hash failed, ${e.toString()}`);
    }
  }

  @tryLock('collect_lock')
  public async collect() {
    const { token_id, config } = this;
    const orders = await orderStore.findAll({
      where: { token_id, type: OrderType.RECHARGE, state: OrderState.CONFIRM, count: { [Op.gte]: config.collect_threshold }, collect_state: 0 },
      limit: 20
    });
  
    const cnt = _.size(orders);
    if (0 == cnt)
      return;

    const collectAddress = await addressStore.find(AddressType.COLLECT, 'eth');
    if (!collectAddress) {
      logger.error(`eth collect address not found`);
      return;
    }

    for (let i = 0; i < cnt; i++) {
      const order = orders[i];
      const order_id = order.id;
      const { user_id, token_id, to: from, count } = order;
      
      const recover = await recoverStore.create({
        user_id,
        token_id,
        order_id,
        value: count,
        from,
        to: collectAddress.address
      });

      await this.collectOne(recover);
    }
  }

  public async collectOne(recover: RecoverModel) {
    const recover_id = _.get(recover, 'id');
    const { user_id, to, from, value } = recover;
    const privateKey = await ethHelper.privateKey(user_id);

    const gasLimit = await web3.eth.estimateGas({ from });
    const price = await web3.eth.getGasPrice();
    const gasPrice = web3.utils.toBN(price);
    const gasFee = toBN(gasLimit).mul(gasPrice);
    const nonce = await web3.eth.getTransactionCount(from);

    const balance = await web3.eth.getBalance(from);
    if (toBN(balance).lt(toBN(value)) || toBN(value).lte(gasFee)) {
      logger.error(`${from} balance not enough ${balance} <= (${value} or ${gasFee})`);
      return;
    }

    const left = toBN(value).sub(gasFee);
    const signedTx = await web3.eth.accounts.signTransaction({
      gas: gasLimit,
      gasPrice: gasPrice.toString(),
      nonce,
      to,
      value: left.toString()
    }, privateKey);

    const self = this;
    try {
    const tx = await web3.eth
      .sendSignedTransaction(signedTx.rawTransaction || '')
      .on('transactionHash', async (txid: string) => {
        await recoverStore.hash(recover_id, txid);
      });
    } catch (e) {
      await recoverStore.hashFail(recover_id);
      logger.error(`recover ${recover_id} hash failed, ${e.toString()}`);
    }
  }
}
