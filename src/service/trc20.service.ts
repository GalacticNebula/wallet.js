import _ from 'lodash';
import cron from 'node-cron';
import moment from 'moment';
import { Op } from 'sequelize';
import BaseService from './base.service';
import { AddressType, Code, OrderState, OrderType, OutOrIn } from "@common/enums";
import { Exception } from "@common/exceptions";
import { TokenModel } from "@models/token.model";
import {
  addressStore,
  configStore,
  orderStore,
  recoverStore,
  tokenStatusStore,
  tokenStore,
  userWalletStore
} from "@store/index";
import { logger, min } from '@common/utils';
import { OrderModel } from '@models/order.model';
import { tryLock } from '@helpers/decorator';
import { tronHelper } from '@helpers/index';
import { findTrc20Config, TRC20_CONFIG } from '@config/trc20';

const client = tronHelper.client;

export class Trc20Service extends BaseService {

  private deposit_lock = false;
  private confirm_lock = false;
  private withdraw_lock = false;
  private collect_lock = false;
  private payfee_lock = false;
  private token_id: number;
  private contract: any;

  constructor(private token: TokenModel, private config: TRC20_CONFIG) {
    super();
    this.token_id = _.get(token, 'id');
  }

  public static async create(token_id: number) {
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.SERVER_ERROR, `token ${token_id} not found`);

    const config = findTrc20Config(token.symbol);
    if (!config) throw new Exception(Code.SERVER_ERROR, `trc20 config ${token.symbol} not found`);

    const ret =  new Trc20Service(token, config);
    await ret.init();
  }

  public async init() {
    const self = this;

    this.contract = await client.contract().at(this.token.address);

    const timezone = 'Asia/Shanghai';
    cron.schedule('* * * * * *', async () => await self.deposit(), { timezone }).start();
    cron.schedule('*/5 * * * * *', async () => await self.confirm(), { timezone }).start();
    cron.schedule('*/3 * * * * *', async () => await self.withdraw(), { timezone }).start();
    cron.schedule('*/4 * * * * *', async () => await self.collect(), { timezone }).start();
    cron.schedule('* * * * *', async () => await self.payFee(), { timezone }).start();
  }

  @tryLock('deposit_lock')
  public async deposit() {
    const { token_id, token, config } = this;
    const status = await tokenStatusStore.findByTokenId(token_id);
    if (!status)
      return;
    
    const { abi_from, abi_to, abi_value } = config;

    const block_id = status.block_id + 1;

    const block = await client.trx.getCurrentBlock();
    let id = _.get(block, 'block_header.raw_data.number');
    id--;

    if (id < block_id)
      return;

    id = min([id, block_id]);

    const options = {
      eventName: 'Transfer',
      blockNumber: id,
      onlyConfirmed: true
    };

    const events = await client.event.getEventsByContractAddress(token.address, options);

    for (let i = 0; i < events.length; i++) {
      const { transaction: txid, timestamp, result, block } = events[i];
      const fromh = _.get(result, abi_from);
      const toh = _.get(result, abi_to);
      const count = _.get(result, abi_value);

      const from = client.address.fromHex(fromh);
      const to = client.address.fromHex(toh);

      const wallet = await userWalletStore.findOne({ where: { tron: to } });
      if (!wallet)
        continue;

      const exist = await orderStore.findOne({ where: { txid, token_id } });
      if (exist != null)
        continue;

      const order = await orderStore.create({
        user_id: wallet.user_id,
        token_id,
        txid,
        timestamp: moment(timestamp),
        out_or_in: OutOrIn.OUT,
        type: OrderType.RECHARGE,
        count,
        from,
        to,
        block_number: block,
        state: OrderState.CONFIRM,
        cold: wallet.cold
      });

      await this.notify(order.id);
    }

    await tokenStatusStore.setBlockId(token_id, id);
  }

  @tryLock('payfee_lock')
  public async payFee() {
    const { token_id, config } = this;
    const orders = await orderStore.findAll({
      where: { token_id, type: OrderType.RECHARGE, state: OrderState.CONFIRM, count: { [Op.gte]: config.collect_threshold }, collect_state: 0 },
      limit: 20
    });

    const cnt = _.size(orders);
    if (0 == cnt)
      return;

    const uids = _.uniq(orders.map(v => v.user_id));

    const gasAddress = await addressStore.find(AddressType.GAS, 'tron');
    if (!gasAddress) {
      logger.error(`tron gas address not found`);
      return;
    }

    const { private_key, address: gas } = gasAddress;
    for (let i = 0; i < uids.length; i++) {
      const uid = uids[i];
      const order = _.find(orders, v => v.user_id == uid);
      if (!order) continue;

      const { to } = order;
      const { net, energy } = await this.getResources(to);
      if (net < 500)
        await this.freezeBalance(to, gas, 3, 'BANDWIDTH', 1000, private_key);
      if (energy < 20000)
        await this.freezeBalance(to, gas, 3, 'ENERGY', 100, private_key);
    }
  }

  private async freezeBalance(
    to: string,
    from: string,
    duration: number,
    resource: 'ENERGY' | 'BANDWIDTH',
    count: number,
    privateKey: string
  ) {
    const transaction = await client.transactionBuilder.freezeBalance(client.toSun(count), duration, resource, from, to, 1);
    const signed = await client.trx.sign(transaction, privateKey);
    const receipt = await client.trx.sendRawTransaction(signed);
    if (!_.get(receipt, 'result'))
      logger.error(`freezeBalance to ${to} failed`);
  }

  @tryLock('collect_lock')
  public async collect() {
    const { token_id, config, contract } = this;

    const auto = await configStore.getNumber('auto_collect_tron', 0);
    if (0 == auto)
      return;

    const orders = await orderStore.findAll({
      where: { token_id, type: OrderType.RECHARGE, state: OrderState.CONFIRM, count: { [Op.gte]: config.collect_threshold }, collect_state: 0, cold: false },
      limit: 50
    });

    const cnt = _.size(orders);
    if (0 == cnt)
      return;

    const collectAddress = await addressStore.find(AddressType.COLLECT, 'tron');
    if (!collectAddress) {
      logger.error(`tron collect address not found`);
      return;
    }

    const uids = _.uniq(orders.map(v => v.user_id));
    for (let i = 0; i < uids.length; i++) {
      const uid = uids[i];
      const order = _.find(orders, v => v.user_id == uid);
      if (!order)
        continue;

      const ids = _.filter(orders, v => v.user_id == uid).map(v => v.id);
      await orderStore.fee(ids);

      const { to: from } = order;
      const balance = await contract.balanceOf(from).call();
      if (balance > config.collect_threshold)
        await this.collectOne(uid, from, collectAddress.address);
    }
  }

  private async getResources(address: string) {
    const ret = await client.trx.getAccountResources(address);
    const net = _.defaultTo(ret.freeNetLimit, 0) + _.defaultTo(ret.NetLimit, 0) - _.defaultTo(ret.freeNetUsed, 0) - _.defaultTo(ret.NetUsed, 0);
    const energy = _.defaultTo(ret.EnergyLimit, 0) - _.defaultTo(ret.EnergyUsed, 0);
    return { net, energy };
  }

  private async collectOne(uid: number, from: string, to: string) {
    const { token_id, contract } = this;
    const balance = await contract.balanceOf(from).call();

    const { net, energy } = await this.getResources(from);
    if (net < 500 || energy < 20000) {
      console.log(`user ${uid} cant collect: net=${net} energy=${energy}`);
      return;
    }

    const privateKey = await tronHelper.privateKey(uid);
    const txid = await this.transfer(from, to, balance, privateKey.slice(2));
    if (!txid)
      return;
  
    const recover = await recoverStore.create({
      user_id: uid,
      token_id,
      value: balance,
      from,
      to,
      txid,
      state: OrderState.HASH
    });
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

    const address = await addressStore.find(AddressType.WITHDRAW, 'tron');
    if (!address) {
      logger.error(`tron withdraw address not found`);
      return;
    }

    const { private_key } = address;
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      await this.withdrawOne(order, private_key);
    }
  }

  private async transfer(from: string, to: string, count: number, privateKey: string) {
    const { contract } = this;
    const balance = await contract.balanceOf(from).call();
    if (balance < count) {
      logger.error(`${from} balance not enough ${count}`);
      return;
    }

    try {
      const txid = await contract.transfer(to, count).send({
        from,
      }, privateKey);

      return txid;
    } catch (e) {
      logger.error(`transfer failed, ${e.toString()}`);
    }
  }

  private async withdrawOne(order: OrderModel, privateKey: string) {
    const order_id = _.get(order, 'id');
    const { from, to, count } = order;

    const txid = await this.transfer(from, to, count, privateKey);
    if (txid != null) {
      await orderStore.hash(order_id, txid);
    } else {
      await orderStore.hashFail(order_id);
    }

    await this.notify(order_id);
  }

  private async confirmOrders() {
    const { token_id } = this;
    const orders = await orderStore.findAll({
      where: { token_id, state: OrderState.HASH }
    });

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const { id, txid } = order;
      
      const ret = await client.trx.getTransactionInfo(txid);
      if (!Object.keys(ret).length)
        continue;

      const failed = (_.get(ret, 'result') === 'FAILED' || !_.has(ret, 'contractResult'));
      const done = await orderStore.finish(id, !failed);
      if (!done) logger.error(`finish ${id} ${status} failed`);

      await this.notify(id);
    }
  }

  private async confirmRecovery() {
    const { token_id } = this;
    const recovers = await recoverStore.findAll({
      where: { token_id, state: OrderState.HASH }
    });

    for (let i = 0; i < recovers.length; i++) {
      const recover = recovers[i];
      const { id, txid } = recover;

      const ret = await client.trx.getTransactionInfo(txid);
      if (!Object.keys(ret).length)
        continue;

      const failed = (_.get(ret, 'result') === 'FAILED' || !_.has(ret, 'contractResult'));

      const done = await recoverStore.finish(id, !failed);
      if (!done) logger.error(`recover finish ${id} ${!failed} failed`);
    }
  }

  @tryLock('confirm_lock')
  public async confirm() {
    await this.confirmOrders();
    await this.confirmRecovery();
  }

}

