import _ from 'lodash';
import cron from 'node-cron';
import moment from 'moment';
import { Op } from 'sequelize';
import BaseService from './base.service';
import { AddressType, Code, OrderState, OrderType, OutOrIn } from "@common/enums";
import { Assert, Exception } from "@common/exceptions";
import { TokenModel } from "@models/token.model";
import { addressStore, feeStore, orderStore, recoverStore, tokenStatusStore, tokenStore, userWalletStore } from "@store/index";
import { ERC20_CONFIG, findErc20Config } from '@config/erc20';
import { logger, min } from '@common/utils';
import { OrderModel } from '@models/order.model';
import { ethHelper } from '@helpers/index';
import { RecoverModel } from '@models/recover.model';
import { sequelize } from '@common/dbs';
import { FeeModel } from '@models/fee.model';
import { pushTask } from '@common/mq';
import { WORKER_QUEUE } from '@common/constants';

const web3 = ethHelper.web3;
const toBN = web3.utils.toBN;

function tryLock(name: string) {
  return function(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<(...args: any[]) => any>) {
    const method = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      if (!_.has(this, name)) throw new Exception(Code.SERVER_ERROR, `target without ${name}`);
      if (_.get(this, name) == true)
        return;

      _.set(this, name, true);
      const result = await method!.apply(this, args);
      _.set(this, name, false);
      return result;
    };
  };
}

export class Erc20Service extends BaseService {

  private deposit_lock = false;
  private confirm_lock = false;
  private withdraw_lock = false;
  private collect_lock = false;
  private payfee_lock = false;
  private token_id: number;
  private contract: any;

  constructor(private token: TokenModel, private config: ERC20_CONFIG) {
    super();
    this.token_id = _.get(token, 'id');
    this.init();
  }

  public static async create(token_id: number) {
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.SERVER_ERROR, `token ${token_id} not found`);

    const config = findErc20Config(token.symbol);
    if (!config) throw new Exception(Code.SERVER_ERROR, `erc20 config ${token.symbol} not found`);

    return new Erc20Service(token, config);
  }

  public init() {
    const self = this;

    this.contract = new web3.eth.Contract(this.config.abi, this.token.address);

    const timezone = 'Asia/Shanghai';
    cron.schedule('*/8 * * * * *', async () => await self.deposit(), { timezone }).start();
    cron.schedule('*/15 * * * * *', async () => await self.confirm(), { timezone }).start();
    cron.schedule('*/10 * * * * *', async () => await self.withdraw(), { timezone }).start();
    cron.schedule('6,21,36,51 * * * * *', async () => await self.collect(), { timezone }).start();
    cron.schedule('3,18,33,48 * * * * *', async () => await self.payFee(), { timezone }).start();
  }

  @tryLock('deposit_lock')
  public async deposit() {
    const { token_id, config, contract } = this;
    const status = await tokenStatusStore.findByTokenId(token_id);
    if (!status)
      return;

    const { step, abi_from, abi_to, abi_value } = config;
    
    const blockIndex = status.block_id + 1;
    let id = await web3.eth.getBlockNumber();
    id--;

    if (id < blockIndex)
      return;

    id = min([id, blockIndex + step - 1]);
    const events = await contract.getPastEvents('Transfer', {
      fromBlock: blockIndex,
      toBlock: id
    });

    for (let i = 0; i < events.length; i++) {
      const { transactionHash: txid, returnValues, blockNumber } = events[i];
      const from = _.get(returnValues, abi_from);
      const to = _.get(returnValues, abi_to);
      const count = _.get(returnValues, abi_value);
      if (!to)
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
        timestamp: moment(),
        out_or_in: OutOrIn.OUT,
        type: OrderType.RECHARGE,
        count,
        from_address: from,
        to_address: to,
        block_number: blockNumber,
        state: OrderState.HASH
      });

      await this.notify(order.id);
    }

    await tokenStatusStore.setBlockId(this.token_id, id);
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

  private async confirmFee() {
    const { token_id } = this;
    const fees = await feeStore.findAll({
      where: { token_id, state: [ OrderState.HASH, OrderState.WAIT_CONFIRM ] }
    });

    const collectAddress = await addressStore.find(AddressType.COLLECT, 'eth');
    if (!collectAddress) {
      logger.error(`eth collect address not found`);
      return;
    }

    for (let i = 0; i < fees.length; i++) {
      const fee = fees[i];
      const { id, user_id, order_id, state, txid } = fee;
      if (state == OrderState.HASH) {
        const ob = await web3.eth.getTransaction(txid);
        if (!_.isNil(ob.blockNumber)) {
          const up = await feeStore.waitConfirm(id, ob.blockNumber);
          if (!up) logger.error(`fee wait confirm ${id} failed`);
        }
      }

      const ob = await web3.eth.getTransactionReceipt(txid);
      if (!ob)
        continue;

      const { status } = ob;
      const done = await feeStore.finish(id, status);
      if (!done) logger.error(`fee finish ${id} ${status} failed`);

      if (!status)
        continue;
        
      const order = await orderStore.findById(order_id);
      if (!order)
        continue;

      const { count, to_address: from } = order;

      const recover = await recoverStore.create({
        user_id,
        token_id,
        order_id,
        value: count,
        from_address: from,
        to_address: collectAddress.address
      });
    }
  }

  private async confirmRecovery() {
    const { token_id } = this;
    const recovers = await recoverStore.findAll({
      where: { token_id, state: [ OrderState.HASH, OrderState.WAIT_CONFIRM ] }
    });

    for (let i = 0; i < recovers.length; i++) {
      const recover = recovers[i];
      const { id, order_id, state, txid } = recover;
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

      if (status)
        await orderStore.collected(order_id);
    }
  }

  @tryLock('confirm_lock')
  public async confirm() {
    await this.confirmOrders();
    await this.confirmFee();
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
    const { from_address: from, to_address: to, count } = order;
    const { contract } = this;

    const nonce = await web3.eth.getTransactionCount(from);
    const balance = await contract.methods.balanceOf(from).call();
    if (balance < count) {
      logger.error(`${from} balance not enough ${count}`);
      return;
    }

    const method = contract.methods.transfer(to, count);
    const txData = method.encodeABI();
    const gasLimit = await method.estimateGas({ from });
    const gasPrice = await web3.eth.getGasPrice();
    const gasFee = toBN(gasLimit).mul(toBN(gasPrice));

    const ethBalance = await web3.eth.getBalance(from);
    if (toBN(ethBalance).lt(gasFee)) {
      logger.error(`${from} balance not enough ${ethBalance} < ${gasFee}`);
      return;
    }

    const signedTx = await web3.eth.accounts.signTransaction({
      gas: gasLimit,
      gasPrice,
      nonce,
      to: contract.options.address,
      data: txData
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

  @tryLock('payfee_lock')
  public async payFee() {
    const { token_id } = this;
    const orders = await orderStore.findAll({
      where: { token_id, type: OrderType.RECHARGE, state: OrderState.CONFIRM, count: { [Op.gte]: this.config.collect_threshold }, collect_state: 0 },
      limit: 20
    });

    const cnt = _.size(orders);
    if (0 == cnt)
      return;

    const gasAddress = await addressStore.find(AddressType.GAS, 'eth');
    if (!gasAddress) {
      logger.error(`eth gas address not found`);
      return;
    }

    const { private_key } = gasAddress;
    for (let i = 0; i < cnt; i++) {
      const order = orders[i];
      const order_id = order.id;
      const { user_id, token_id, to_address } = order;

      let fee;
      let transaction;
      try {
        transaction = await sequelize.transaction();

        const up  = await orderStore.fee(order.id, transaction);
        Assert(up, Code.SERVER_ERROR, `order ${order.id} fee failed`);

        fee = await feeStore.create({
          user_id,
          token_id,
          order_id,
          value: 0,
          from_address: gasAddress.address,
          to_address
        }, transaction);
        
        await transaction.commit();
      } catch (e) {
        await transaction?.rollback();
        continue;
      }

      await this.payFeeOne(fee, private_key);
    }
  }

  public async payFeeOne(fee: FeeModel, privateKey: string) {
    const fee_id = _.get(fee, 'id');
    const { from_address: from, to_address: to } = fee;

    const gasLimit = await web3.eth.estimateGas({ from });

    const price = await web3.eth.getGasPrice();

    const gasPrice = web3.utils
          .toBN(price);
	  //.add(toBN(10000000000));

    const gasFee = toBN(gasLimit).mul(gasPrice);

    const gasBalance = toBN(await web3.eth.getBalance(from));
    if (gasBalance.lt(gasFee.mul(toBN(2)))) {
      logger.error(`gas ${from} not enough ${gasBalance} < ${gasFee.mul(toBN(2))}`);
      return;
    }

    const nonce = await web3.eth.getTransactionCount(from);

    const signedTx = await web3.eth.accounts.signTransaction({
      gas: gasLimit,
      gasPrice: gasPrice.toString(),
      nonce,
      to,
      value: gasFee.toString()
    }, privateKey);

    try {
      await web3.eth
        .sendSignedTransaction(signedTx.rawTransaction || '')
        .on('transactionHash', async (hash: string) => {
          await feeStore.hash(fee_id, hash, Number(gasFee.toString()));
        });
    } catch (e) {
      logger.error(`fee ${fee_id} hash failed, ${e.toString()}`);
    }
  }

  @tryLock('collect_lock')
  public async collect() {
    const { token_id } = this;
    const recovers = await recoverStore.findAll({
      where: { token_id, state: OrderState.CREATED },
      limit: 20
    });

    const cnt = _.size(recovers);
    if (0 == cnt)
      return;

    for (let i = 0; i < cnt; i++) {
      const recover = recovers[i];
      await this.collectOne(recover);
    }
  }

  public async collectOne(recover: RecoverModel) {
    const recover_id = _.get(recover, 'id');
    const { user_id, to_address: to, from_address: from, value } = recover;
    const { contract } = this;

    const privateKey = await ethHelper.privateKey(user_id);

    const nonce = await web3.eth.getTransactionCount(from);
    const balance = await contract.methods.balanceOf(from).call();
    if (balance < value) {
      logger.error(`collect ${from} balance not enough ${value}`);
      return;
    }

    const method = contract.methods.transfer(to, value);
    const txData = method.encodeABI();

    const gasLimit = await method.estimateGas({ from });
    const gasPrice = await web3.eth.getGasPrice();
    const gasFee = toBN(gasLimit).mul(toBN(gasPrice));

    const ethBalance = await web3.eth.getBalance(from);
    if (web3.utils.toBN(ethBalance).lt(gasFee)) {
      //logger.error(`collect ${from} balance not enough ${ethBalance} < ${gasFee}`);
      return;
    }

    const signedTx = await web3.eth.accounts.signTransaction({
      gas: gasLimit,
      gasPrice,
      nonce,
      to: contract.options.address,
      data: txData
    }, privateKey);

    try {
    const tx = await web3.eth
      .sendSignedTransaction(signedTx.rawTransaction || '')
      .on('transactionHash', async (txid: string) => {
        await recoverStore.hash(recover_id, txid);
      });
    } catch (e) {
      await recoverStore.hashFail(recover_id);
      logger.error(`recover order ${recover_id} hash failed, ${e.toString()}`);
    }
  }

  public async notify(order_id: number) {
    await pushTask(WORKER_QUEUE, { action: 'callback', data: { order_id } });
  }

}
