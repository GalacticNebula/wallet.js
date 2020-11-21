import _ from 'lodash';
import cron from 'node-cron';
import moment from 'moment';
import { Op } from 'sequelize';
import BaseService from './base.service';
import { AddressType, Code, OrderState, OrderType, OutOrIn } from "@common/enums";
import { Assert, Exception } from "@common/exceptions";
import { TokenModel } from "@models/token.model";
import {
  addressStore,
  feeStore,
  orderStore,
  recoverStore,
  tokenStatusStore,
  tokenStore,
  userWalletStore
} from "@store/index";
import { logger, min } from '@common/utils';
import { OrderModel } from '@models/order.model';
import { RecoverModel } from '@models/recover.model';
import { sequelize } from '@common/dbs';
import { FeeModel } from '@models/fee.model';
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
        from_address: from,
        to_address: to,
        block_number: block,
        state: OrderState.CONFIRM
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

    const gasAddress = await addressStore.find(AddressType.GAS, 'tron');
    if (!gasAddress) {
      logger.error(`tron gas address not found`);
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

    const gasAddress = await addressStore.find(AddressType.GAS, 'tron');
    if (!gasAddress) {
      logger.error(`tron gas address not found`);
      return;
    }

    for (let i = 0; i < cnt; i++) {
      const order = orders[i];
      // 1. 抵押贷款和能量

      // 2. 转账到归集账户

    }
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

  private async withdrawOne(order: OrderModel, privateKey: string) {
    const order_id = _.get(order, 'id');
    const { from_address: from, to_address: to, count } = order;
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

      await orderStore.hash(order_id, txid);
      await this.notify(order_id);
    } catch (e) {
      await orderStore.hashFail(order_id);
      await this.notify(order_id);
      logger.error(`order ${order_id} hash failed, ${e.toString()}`);
    }
  }

  private async confirmOrders() {
    const { token_id } = this;
    const orders = await orderStore.findAll({
      where: { token_id, state: OrderState.HASH }
    });

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const { id, txid } = order;
      let updated = false;
      
      const ret = await client.trx.getTransactionInfo(txid);
      if (!Object.keys(ret).length)
        continue;

      console.log(ret);

      const failed = (_.get(ret, 'result') === 'FAILED' || !_.has(ret, 'contractResult'));
      const done = await orderStore.finish(id, !failed);
      if (!done) logger.error(`finish ${id} ${status} failed`);

      if (updated)
        await this.notify(id);
    }
  }

  @tryLock('confirm_lock')
  public async confirm() {
    await this.confirmOrders();
  }

}

