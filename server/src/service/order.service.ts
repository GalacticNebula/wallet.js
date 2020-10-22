import _ from 'lodash';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { UniqueConstraintError } from 'sequelize';
import BaseService from './base.service';
import {
  cardStore,
  merchantStore,
  OrderPayType,
  OrderState,
  orderStore,
  userQueueStore,
  userWalletStore,
  userWithdrawStore,
  userRechargeStore,
  p2pOrderStore,
  redisStore,
  userLockStore,
  configStore,
  levelStore,
  UserWithdrawState,
  merchantWithdrawStore, agentStore, userStatisticStore, statisticStore, UserLogType, userLogStore, MerchantLogType, merchantLogStore, userStore
} from '@store/index';
import { Assert, Exception } from '@common/exceptions';
import { CardType, Code, NotifyType } from '@common/enums';
import { sequelize } from '@common/dbs';
import { pushTask } from '@common/mq';
import { PROJECT_NAME, WORKER_QUEUE } from '@common/constants';
import { env, logger, np, sign } from '@common/utils';
import { UserModel } from '@models/user.model';
import { userService } from './user.service';

class OrderService extends BaseService {

  public async token(params: any) {
    const { merchant_id, orderid, uid, amount, pay_type } = params;
    const token = uuidv4();
    const key = `${PROJECT_NAME}:mtoken:${token}`;
    await redisStore.setex(
      key,
      JSON.stringify({
        merchant_id, orderid, uid, amount, pay_type
      }),
      60 * 30
    );

    return token;
  }

  private async checkToken(token: string, params: any, fields: string[]) {
    const key = `${PROJECT_NAME}:mtoken:${token}`;
    const data = await redisStore.get(key);
    if (_.isNil(data) || _.isEmpty(data))
      return false;

    const ob = JSON.parse(data);
    for (let i = 0; i < fields.length; i++) {
      const fd = fields[i];
      if (params[fd] != ob[fd])
        return false;
    }

    return true;
  }

  public async apply(params: any) {
    const { merchant_id, orderid, uid, amount, pay_type, token } = params;
    
    const checked = await this.checkToken(token, params, ['merchant_id', 'orderid', 'uid', 'amount', 'pay_type']);
    Assert(checked, Code.BAD_PARAMS, 'invalid token');

    const merchant = await merchantStore.findById(merchant_id);
    if (!merchant) throw new Exception(Code.SERVER_ERROR, '商户不存在');

    const exist = await orderStore.find(merchant_id, orderid);
    if (exist)
      return;

    let order_id = 0;
    try {
      const order = await orderStore.create({
        merchant_id,
        orderid,
        pay_type,
        merchant_uid: uid,
        amount,
        real_amount: amount
      });

      order_id = order.id;
    } catch (e) {
      if (e instanceof UniqueConstraintError)
        throw new Exception(Code.BAD_PARAMS, '订单号重复，无法生成订单');

      throw e;
    }

    await this.notifyOrderMatch({ order_id });
  }

  public async query(params: any) {
    const { merchant_id, orderid, token } = params;
    const checked = await this.checkToken(token, params, ['merchant_id', 'orderid']);
    Assert(checked, Code.BAD_PARAMS, 'invalid token');

    const order = await orderStore.find(merchant_id, orderid);
    if (!order) throw new Exception(Code.BAD_PARAMS, '订单不存在');
    return order.serializer();
  }

  public async mquery(params: any) {
    const { merchant_id, orderid, token } = params;
    const checked = await this.checkToken(token, params, ['merchant_id', 'orderid']);
    Assert(checked, Code.BAD_PARAMS, 'invalid token');

    const merchant = await merchantStore.findById(merchant_id);
    if (!merchant) throw new Exception(Code.SERVER_ERROR, '商户不存在');

    const order = await orderStore.find(merchant_id, orderid);
    if (!order) throw new Exception(Code.BAD_PARAMS, '订单不存在');

    const { merchant_uid, pay_type, amount, real_amount, paid, state } = order;
    const data = {
      merchant_id,
      orderid,
      uid: merchant_uid,
      pay_type,
      amount,
      real_amount,
      state,
      paid: (paid ? 1 : 0)
    };

    return { data, token: sign(data, merchant.secret) };
  }

  public async state(params: any) {
    const { merchant_id, orderid, state, token } = params;
    const checked = await this.checkToken(token, params, ['merchant_id', 'orderid']);
    Assert(checked, Code.BAD_PARAMS, 'invalid token');

    if (state == 0) {
      return await this.revoke(merchant_id, orderid);
    } else if (state == 1) {
      return await this.pay(merchant_id, orderid);
    }
  }

  private async pay(merchant_id: number, orderid: string) {
    const paid = await orderStore.pay(merchant_id, orderid);
    Assert(paid, Code.OPERATION_FORBIDDEN, '订单已是支付状态');
  }

  private async revoke(merchant_id: number, orderid: string) {
    let order = await orderStore.find(merchant_id, orderid);
    if (!order) throw new Exception(Code.BAD_PARAMS, '订单不存在');

    const { uid } = order;
    Assert([OrderState.CREATED, OrderState.MATCH].includes(order.state), Code.OPERATION_FORBIDDEN, `订单${orderid}无法取消${order.state}`);

    // maybe state was changed to MATCH
    if (order.state == OrderState.CREATED) {
      const revoked = await orderStore.revoke(order.id, OrderState.CREATED);
      if (revoked) return;
    }

    order = await orderStore.find(merchant_id, orderid);
    if (!order) throw new Exception(Code.SERVER_ERROR, '订单不存在');

    const { state, amount } = order;
    Assert(state == OrderState.MATCH, Code.SERVER_ERROR, `invalid order state ${state}`);

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const revoked = await orderStore.revoke(order.id, OrderState.MATCH);
      Assert(revoked, Code.SERVER_ERROR, '取消订单异常，请联系管理员');

      const unlock = await userWalletStore.unlock(uid, amount, transaction);
      Assert(unlock, Code.SERVER_ERROR, '解锁接单员余额失败');

      const unlock2 = await userLockStore.remove(order.id, transaction);
      Assert(unlock2, Code.SERVER_ERROR, `user unlock order ${order.id} failed`);

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    await this.upQueue(uid);
  }

  public async upQueue(uid: number) {
    try {
      const balance = await userWalletStore.balance(uid);
      await userQueueStore.update(uid, balance);
    } catch (e) {
      logger.error(`upQueue failed`);
    }
  }

  public payType2CardType(type: OrderPayType) {
    if (type == OrderPayType.BANK || type == OrderPayType.ALIPAY_TO_BANK)
      return CardType.BANK;
    else if (type == OrderPayType.ALIPAY)
      return CardType.ALIPAY;
    else
      return CardType.BANK;
  }

  public async match(id: number) {
    const order = await orderStore.findById(id);
    if (!order) throw new Exception(Code.BAD_PARAMS, '订单不存在');
    Assert(order.state == OrderState.CREATED, Code.SERVER_ERROR, 'match订单状态错误');

    const match_min = await configStore.getNumber('match_min', 100);

    let done = false;
    const { pay_type, amount } = order;
    const cardType = this.payType2CardType(pay_type);
    const rows = await userQueueStore.match(pay_type, amount);
    for (let i = 0; i < rows.length; i++) {
      const { uid, start_at } = rows[i];
      const card = await cardStore.findActive(uid, cardType);
      if (!card) continue;

      const lock = await userLockStore.find(uid, amount);
      if (lock != null)
        continue;

      const balance = await userWalletStore.balance(uid);
      if (balance <= match_min) continue;

      let transaction;
      try {
        transaction = await sequelize.transaction();

        const ulock = await userLockStore.add({
          uid,
          amount,
          order_id: id
        }, transaction);
        Assert(ulock != null, Code.SERVER_ERROR, 'user lock failed');

        const locked = await userWalletStore.lock(uid, amount, transaction);
        Assert(locked, Code.SERVER_ERROR, 'lock faild');

        const done = await orderStore.match(id, card, transaction);
        Assert(done, Code.SERVER_ERROR, 'match failed');

        await transaction.commit();
      } catch (e) {
        await transaction?.rollback();
        continue;
      }

      await this.requeue(uid, start_at);
      await userService.notify(uid, NotifyType.NEW_ORDER);
      done = true;
      break;
    }

    return done;
  }

  public async enqueue(uid: number, start_at ?: Date) {
    const cards = await cardStore.findByUid(uid);
    const bank_enabled = _.findIndex(cards, v => v.type == CardType.BANK) >= 0;
    const alipay_enabled = _.findIndex(cards, v => v.type == CardType.ALIPAY) >= 0;
    const balance = await userWalletStore.balance(uid);
    
    const data: any = {
      uid,
      balance,
      bank_enabled,
      alipay_enabled
    };

    await userQueueStore.add(data, start_at);
  }

  public async requeue(uid: number, start_at: Date) {
    await this.dequeue(uid);
    await this.enqueue(uid, start_at);
  }

  public async dequeue(uid: number) {
    await userQueueStore.remove(uid);
  }

  public async list(uid: number, params: any) {
    const { active, page, pageSize } = params;
    const orders = await orderStore.list(uid, { active, page, pageSize });
    return orders.map(v => v.serializer());
  }

  public async confirm(u: UserModel, params: any) {
    const uid = _.get(u, 'id');
    const { id, real } = params;
    const order = await orderStore.findById(id);
    if (!order) throw new Exception(Code.OPERATION_FORBIDDEN, 'order not found');
    Assert(uid == order.uid, Code.OPERATION_FORBIDDEN, 'not your order');
    Assert(order.state == OrderState.MATCH, Code.OPERATION_FORBIDDEN, 'order not match state');

    const { merchant_id, orderid, amount, pay_type } = order;
    const merchant = await merchantStore.findById(merchant_id);
    if (!merchant) throw new Exception(Code.SERVER_ERROR, 'merchant not found');
    const { callback, agent_id, admin_id, secret } = merchant;

    const rate = _.get(merchant, `rate_${pay_type}`);
    const real_amount = _.defaultTo(real, amount);

    const fee = _.floor(np.divide(np.times(real_amount, rate), 1000), 2);
    const add = np.minus(real_amount, fee);

    const level = await levelStore.findByLevel(u.level);
    if (!level) throw new Exception(Code.SERVER_ERROR, `level ${u.level} not found`);

    const urate = _.defaultTo(_.get(level, `rate_${order.pay_type}`), 0);
    const reward = _.floor(np.divide(np.times(real_amount, urate), 1000), 2);
    const payment = np.minus(real_amount, reward);

    let left = np.minus(fee, reward);
    let agent_reward = 0;
    if (agent_id > 0) {
      const agent = await agentStore.findByAdminId(agent_id);
      if (agent != null && agent.enabled) {
        const agent_rate = _.defaultTo(_.get(agent, `rate_${pay_type}`), 0);
        agent_reward = _.floor(np.divide(np.times(real_amount, agent_rate), 1000), 2);
        left = np.minus(left, agent_reward);
      }
    }

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const confirmed = await orderStore.confirm(order.id, uid, real_amount, transaction);
      Assert(confirmed, Code.SERVER_ERROR, `confirm order ${order.id} failed`);

      const paid = await userWalletStore.pay(uid, payment, amount, true, transaction);
      Assert(paid, Code.SERVER_ERROR, `user ${uid} pay ${amount} failed`);

      const accepted = await merchantStore.accept(admin_id, add, transaction);
      Assert(accepted, Code.SERVER_ERROR, `merchant ${merchant_id} accept ${add} failed`);

      if (agent_reward > 0) {
        const agented = await agentStore.accept(agent_id, agent_reward, transaction);
        Assert(agented, Code.SERVER_ERROR, `agent ${agent_id} accept ${agent_reward} failed.`);
      }

      const unlock = await userLockStore.remove(id, transaction);
      Assert(unlock, Code.SERVER_ERROR, `user unlock order ${id} failed`);

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    const record = {
      uid,
      admin_id,
      agent_id,
      fee,           // 手续费总额
      reward,        // 给接单员的手续费
      agent_reward,  // 给招商经理的手续费
      left           // 剩下给系统的手续费
    };

    const data = {
      id,
      orderid,
      amount,
      real_amount,
      pay_type,
      callback,
      secret,
      record
    };

    await this.notifyOrderDone(data);
  }

  public async orderDone(data: any) {
    const {
      id,
      orderid,
      amount,
      real_amount,
      pay_type,
      callback,
      secret,
      record
    } = data;

    const {
      uid,
      admin_id,
      agent_id,
      fee,          // 手续费总额
      reward,       // 给接单员的手续费
      agent_reward, // 给招商经理的手续费,
      left          // 剩下给系统的手续费
    } = record;

    let real_left = left;

    try {
      const total = await this.share(id, uid, real_amount, pay_type);
      if (total > 0)
        real_left = np.minus(real_left, total);
    } catch (e) {
      logger.error(`order ${id} share failed`);
    }

    try {
      await merchantStore.add(
        admin_id,
        {
          total_in_amount: real_amount,
          total_in_orders: 1,
          total_fee: fee
        }
      );

      if (agent_reward > 0)
        await agentStore.add(agent_id, { total_fee: agent_reward });

      await userStatisticStore.add(
        uid,
        {
          total_fee: reward,
          total_in_amount: real_amount,
          verified_in_orders: 1
        }
      );

      await statisticStore.add({ total_fee: real_left });
    } catch (e) {
      logger.error(`order statistics failed`);
    }

    try {
      const wallet = await userWalletStore.findByUid(uid);
      if (!wallet) throw new Exception(Code.SERVER_ERROR, `${uid} wallet not found`);
      const { balance } = wallet;
      const before = np.minus(np.plus(balance, real_amount), reward);

      const ulogs = [
        {
          uid,
          type: UserLogType.ACCEPT,
          amount: np.minus(0, real_amount),
          before,
          after: np.minus(before, real_amount),
          remark: '' + id
        },
        {
          uid,
          type: UserLogType.ACCEPT_REWARD,
          amount: reward,
          before: np.minus(before, real_amount),
          after: balance,
          remark: '' + id
        }
      ];

      await userLogStore.bulkCreate(ulogs);
    } catch (e) {
      logger.error(`user log failed ${e.toString()}`);
    }

    try {
      const merchant = await merchantStore.findByAdminId(admin_id);
      if (!merchant) throw new Exception(Code.SERVER_ERROR, `merchant ${admin_id} not found`);
      const { balance: nbalance } = merchant;
      const add = np.minus(real_amount, fee);
      const mlog = {
        admin_id,
        type: MerchantLogType.RECHARGE,
        amount: add,
        before: np.minus(nbalance, add),
        after: nbalance,
        remark: '' + id
      }

      await merchantLogStore.bulkCreate([mlog]);
    } catch (e) {
      logger.error(`merchant log failed ${e.toString()}`);
    }

    if (agent_reward > 0) {
      try {
        const agent = await agentStore.findByAdminId(agent_id);
        if (!agent) throw new Exception(Code.SERVER_ERROR, `agent ${admin_id} not found`);
        const { balance } = agent;
        const mlog = {
          admin_id,
          type: MerchantLogType.ACCEPT_REWARD,
          amount: agent_reward,
          before: np.minus(balance, agent_reward),
          after: balance,
          remark: '' + id
        };
        
        await merchantLogStore.bulkCreate([mlog]);
      } catch (e) {
        logger.error(`agent log failed ${e.toString()}`);
      }
    }

    await this.callback({
      id,
      orderid,
      amount,
      real_amount,
      result: 1,
      callback,
      secret
    });
  }

  private async share(id: number, uid: number, amount: number, pay_type: number) {
    const u = await userStore.findById(uid);
    if (!u) throw new Exception(Code.SERVER_ERROR, `user ${uid} not exist`);

    const levels = await levelStore.list();
    const cmap: { [key:number]: any } = {};
    levels.forEach(v => cmap[v.level] = v.serializer());

    let level = u.level;
    let pid = u.pid;
    let rate = _.defaultTo(_.get(cmap[level], `rate_${pay_type}`), 0);

    const share_hierarchy = await configStore.getNumber('share_hierarchy', 1);

    let total = 0;
    const to = [];

    for (let i = 0; i < share_hierarchy; i++) {
      const parent = await userStore.findById(pid);
      if (!parent)
        break;

      if (parent.level <= level)
        break;

      const prate = _.defaultTo(_.get(cmap[parent.level], `rate_${pay_type}`), 0);
      if (prate <= rate)
        break;

      const reward = _.floor(np.divide(np.times(amount, np.minus(prate, rate)), 1000), 2);
      if (reward > 0)
        to.push({ pid, reward });

      pid = parent.pid;
      level = parent.level;
      rate = prate;
      total = np.plus(total, reward);
    }

    const ulogs = [];

    for (let i = 0; i < to.length; i++) {
      const { pid, reward } = to[i];
      const got = await userWalletStore.accept(pid, reward);
      if (!got) {
        logger.error(`share to ${pid} ${amount} failed`);
        continue;
      }

      await userStatisticStore.add(pid, { total_fee: reward });

      const wallet = await userWalletStore.findByUid(pid);
      if (wallet != null) {
        const { balance } = wallet;
        const before = np.minus(balance, reward);
  
        ulogs.push({
          uid: pid,
          type: UserLogType.PARENT_REWARD,
          amount: reward,
          before,
          after: balance,
          remark: `${id}-${uid}`
        });
      }
    }

    if (ulogs.length > 0)
      await userLogStore.bulkCreate(ulogs);

    return total;
  }

  public async callback(params: any) {
    const { id, orderid, amount, real_amount, result, callback, secret } = params;
    try {
      const params = {
        orderid,
        amount,
        real_amount,
        result
      };

      const signature = sign(params, secret);
      const { status, data } = await axios.get(callback, {
        params,
        timeout: 10000,
        headers: {
          'content-type': 'application/json',
          signature
        }
      });

      Assert(status == 200, Code.SERVER_ERROR, `callback ${orderid} failed, status=${status}`);
      const success = _.get(data, 'success');
      Assert(success == true, Code.SERVER_ERROR, `callback ${orderid} failed, ${JSON.stringify(data)}`);

      await orderStore.notify(id);
    } catch (e) {
      logger.error(e.toString());
    }
  }

  // 以下是充值申请相关
  public async applyRecharge(u: UserModel, params: any) {
    const uid = _.get(u, 'id');
    const { amount_min, amount_max, card_id } = params;

    const exist = await userRechargeStore.exist(uid);
    Assert(!exist, Code.OPERATION_FORBIDDEN, '你有未完成的充值申请');

    const card = await cardStore.findById(card_id);
    Assert(card?.uid == uid, Code.BAD_PARAMS, '不是你的卡');

    try {
      const recharge = await userRechargeStore.create({
        uid,
        amount_min,
        amount_max,
        card_id
      });
      Assert(recharge != null, Code.SERVER_ERROR, '创建充值申请失败');
    } catch (e) {
      if (e instanceof UniqueConstraintError)
        throw new Exception(Code.OPERATION_FORBIDDEN, '你有未完成的充值申请');

      throw e;
    }
  }

  public listRecharge(uid: number, params: any) {
    return userRechargeStore.findByUid(uid);
  }

  public revokeRecharge(uid: number, params: any) {
    return userRechargeStore.remove(uid);
  }

  public async rechargeStatus(uid: number, params: any) {
    let status = 0;
    const exist = await userRechargeStore.exist(uid);
    if (exist) {
      status = 1;
    } else {
      const count = await p2pOrderStore.countActive(uid);
      status = (count > 0 ? 2 : 0);
    }

    return { status };
  }

  public async listP2pOrder(uid: number, params: any) {
    const { active, page, pageSize } = params;
    const orders = await p2pOrderStore.list({ uid, active, page, pageSize });
    return orders.map(v => v.serializer());
  }

  public async revokeP2pOrder(uid: number, params: any) {
    const { id } = params;
    const order = await p2pOrderStore.findById(id);
    if (!order) throw new Exception(Code.BAD_PARAMS, 'order not found');

    Assert(order.uid == uid, Code.OPERATION_FORBIDDEN, '不是你的订单');

    const { amount, fee, toid, paid } = order;
    Assert(!paid, Code.OPERATION_FORBIDDEN, '付款后不能撤销');

    const total = np.plus(amount, fee);

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const revoked = await p2pOrderStore.revoke(id, transaction);
      Assert(revoked, Code.SERVER_ERROR, '取消匹配单失败');

      const unlock = await merchantStore.unlock(toid, total, transaction);
      Assert(unlock, Code.SERVER_ERROR, '解锁提现方余额失败');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }
  }

  public async p2pOrderPaid(uid: number, params: any) {
    const { id, receipt } = params;

    const order = await p2pOrderStore.findById(id);
    if (!order) throw new Exception(Code.BAD_PARAMS, '订单不存在');
    Assert(order.uid == uid, Code.OPERATION_FORBIDDEN, '不是你的订单');

    const paid = await p2pOrderStore.pay(id, receipt);
    Assert(paid, Code.SERVER_ERROR, '匹配订单不存在或状态错误');
  }

  public async p2pMatch(rid: number, wid: number) {
    const recharge = await userRechargeStore.findById(rid);
    if (!recharge) throw new Exception(Code.BAD_PARAMS, `充值申请不存在${rid}`);

    const withdraw = await merchantWithdrawStore.findById(wid);
    if (!withdraw) throw new Exception(Code.BAD_PARAMS, `提现申请不存在${wid}`);

    const { amount, admin_id: toid, bank, branch, name, cardno } = withdraw;
    const { amount_min, amount_max, uid, card_id } = recharge;

    Assert(amount >= amount_min && amount <= amount_max, Code.OPERATION_FORBIDDEN, '订单范围无法匹配');

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const order = await p2pOrderStore.create({
        uid,
        card_id,
        toid,
        bank,
        branch,
        name,
        cardno,
        amount,
        fee: 0
      }, transaction);
      Assert(order != null, Code.SERVER_ERROR, '创建匹配单失败');

      const removed = await userRechargeStore.remove(uid, transaction);
      Assert(removed, Code.SERVER_ERROR, '充值申请删除失败');

      const removed2 = await merchantWithdrawStore.remove(wid, transaction);
      Assert(removed2, Code.SERVER_ERROR, '提现申请删除失败');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    await userService.notify(uid, NotifyType.RECHARGE_MATCH);
  }

  public async applyWithdraw(u: UserModel, params: any) {
    const uid = _.get(u, 'id');
    const { card_id, amount } = params;

    const exist = await userWithdrawStore.findByUid(uid);
    Assert(!exist, Code.OPERATION_FORBIDDEN, '你有未完成的提现订单');

    const card = await cardStore.findById(card_id);
    if (!card) throw new Exception(Code.OPERATION_FORBIDDEN, '提现卡不存在');

    const { bank, branch, name, cardno, type } = card;
    Assert(type == CardType.BANK, Code.OPERATION_FORBIDDEN, '提现必须用银行卡');
    Assert(card.uid == uid, Code.BAD_PARAMS, '不是你的卡');

    const rate = await configStore.getNumber('withdraw_rate', 10);
    const fee = _.floor(np.divide(np.times(amount, rate), 1000), 2);

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const withdraw = await userWithdrawStore.create({
        uid,
        amount,
        fee,
        bank,
        branch,
        name,
        cardno
      }, transaction);
      Assert(withdraw != null, Code.SERVER_ERROR, '创建充值提现失败');

      const locked = await userWalletStore.lock(uid, amount, transaction);
      Assert(locked, Code.SERVER_ERROR, '余额不足');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    await this.upQueue(uid);
  }

  public async confirmWithdraw(uid: number, params: any) {
    const { id } = params;
    const withdraw = await userWithdrawStore.findById(id);
    if (!withdraw) throw new Exception(Code.BAD_PARAMS, '提现订单不存在');

    const { amount, fee, state } = withdraw;
    Assert(state == UserWithdrawState.CREATED, Code.OPERATION_FORBIDDEN, `订单状态错误${state}`);
    Assert(uid == withdraw.uid, Code.OPERATION_FORBIDDEN, '不是你的订单');

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const done = await userWithdrawStore.confirm(id, transaction);
      Assert(done, Code.SERVER_ERROR, '确认提现单失败');

      const paid = await userWalletStore.pay(uid, amount, amount, false, transaction);
      Assert(paid, Code.SERVER_ERROR, '为提现方减少余额失败');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    try {
      await userStatisticStore.add(uid, { total_withdraw: amount });
    } catch (e) {
      logger.error(`user statistic add ${uid} total_withdraw ${amount} failed`);
    }

    try {
      await statisticStore.add({ total_withdraw_fee: fee });
    } catch (e) {
      logger.error(`statistic add total_withdraw_fee ${fee} failed`);
    }

    const wallet = await userWalletStore.findByUid(uid);
    if (!wallet) throw new Exception(Code.SERVER_ERROR, 'wallet not found');
    const { balance } = wallet;

    const ulog = {
      uid,
      type: UserLogType.WITHDRAW,
      amount: np.minus(0, amount),
      before: np.plus(balance, amount),
      after: balance
    };

    await userLogStore.bulkCreate([ulog]);
  }

  public async revokeWithdraw(id: number, admin_id: number) {
    const withdraw = await userWithdrawStore.findById(id);
    if (!withdraw) throw new Exception(Code.BAD_PARAMS, '提现订单不存在');

    const { uid, amount, state } = withdraw;
    Assert(state == UserWithdrawState.CREATED, Code.OPERATION_FORBIDDEN, `订单状态错误${state}`);

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const done = await userWithdrawStore.revoke(id, transaction);
      Assert(done, Code.SERVER_ERROR, '取消提现单失败');

      const unlock = await userWalletStore.unlock(uid, amount, transaction);
      Assert(unlock, Code.SERVER_ERROR, '为提现方减少余额失败');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    await this.upQueue(uid);
  }

  public listWithdraw(uid: number, params: any) {
    const { state, active, page, pageSize } = params;
    return userWithdrawStore.list({ uid, state, active, page, pageSize });
  }

  public async notifyOrderMatch(data: any) {
    await pushTask(WORKER_QUEUE, { action: 'order_match', data });
  }

  public async notifyOrderTimeout() {
    await pushTask(WORKER_QUEUE, { action: 'order_timeout' });
  }

  public async notifyOrderDone(data: any) {
    await pushTask(WORKER_QUEUE, { action: 'order_done', data });
  }

  public async matchAll() {
    const oids = await orderStore.newOrderIds();
    const cnt = _.size(oids);
    for (let i = 0; i < cnt; i++) {
      await this.match(oids[i]);
    }
  }

  public async matchOrder(data: any) {
    const { order_id } = data;
    await this.match(order_id);
  }
  
  public async orderTimeout() {
    await orderStore.timeoutCreated(180);

    const ids = await orderStore.timeoutMatchIds(480);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const order = await orderStore.findById(id);
      if (!order) throw new Exception(Code.OPERATION_FORBIDDEN, 'order not found');

      const { uid, amount } = order;

      let transaction;
      try {
        transaction = await sequelize.transaction();

        const timeout = await orderStore.timeoutMatch(id, transaction);
        Assert(timeout, Code.SERVER_ERROR, `order ${id} timeout failed`);

        const unlock = await userWalletStore.unlock(uid, amount, transaction);
        Assert(unlock, Code.SERVER_ERROR, '解锁接单员余额失败');

        const unlock2 = await userLockStore.remove(id, transaction);
        Assert(unlock2, Code.SERVER_ERROR, `user unlock order ${id} failed`);

        await transaction.commit();
      } catch (e) {
        await transaction?.rollback();
        throw e;
      }

      await this.upQueue(order.uid);
    }
  }

  public async userTimeout() {
    await userQueueStore.timeout(15 * 60);
  }

}

export const orderService = new OrderService();
