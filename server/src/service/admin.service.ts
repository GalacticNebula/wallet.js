import _ from 'lodash';
import BaseService from './base.service';
import cryptoRandomString from 'crypto-random-string';
import { sequelize } from '@common/dbs';
import { Op, UniqueConstraintError } from 'sequelize';
import {
  adminStore,
  agentStore,
  AgentWithdrawState,
  agentWithdrawStore,
  merchantStore,
  merchantWithdrawStore,
  orderStore,
  p2pOrderStore,
  userRechargeStore,
  userStore,
  userWalletStore,
  UserWithdrawState,
  userWithdrawStore,
  userStatisticStore,
  userQueueStore,
  OrderState,
  P2pOrderState,
  UserLogType,
  userLogStore,
  MerchantLogType,
  merchantLogStore,
  adminLogStore,
  AdminLogType,
  levelStore,
  configStore, cardStore, adminAllowIpStore, userLockStore
} from '@store/index';
import { captchas, hashPassword, is_testMode, logger, np } from '@common/utils';
import { Assert, Exception } from '@common/exceptions';
import { Code, NotifyType, Power } from '@common/enums';
import { AdminModel } from '@models/admin.model';
import { Role } from '@common/constants';
import { orderService } from './order.service';
import { cardRepository, userRepository, userWalletRepository, userStatisticRepository } from '@models/index';
import { merchantRepository } from '@models/index';
import { adminRepository } from '@models/index';
import { UserModel } from '@models/user.model';
import { userService } from './user.service';

class AdminService extends BaseService {

  public async updateSession(id: number, sid: string, sess: any) {
    await adminStore.updateSession(id, sid, sess);
  }

  public async getSession(sid: string) {
    return adminStore.getSession(sid);
  }

  public async destroySession(sid: string) {
    await adminStore.destorySession(sid);
  }

  public async login(params: any, ip: string) {
    const { username, password, captcha, captchaKey } = params;

    const captchaChecked = await captchas.check(captchaKey, captcha);
    Assert(captchaChecked, Code.BAD_PARAMS, '图形验证码错误');

    const u = await adminStore.findByUsername(username);
    if (!u) throw new Exception(Code.USERNAME_NOT_FOUND, '账户不存在');

    const allowIps = u.allowIps.map(v => v.ip);
    if (!is_testMode() && !allowIps.includes(ip))
      throw new Exception(Code.INVALID_IP, 'IP不允许被登录，请联系管理员.');

    const { locked, retries } = u;
    Assert(!locked, Code.USER_LOCKED, '账户已锁定，请联系管理员');

    await adminLogStore.add(u.id, AdminLogType.LOGIN, u.id, { username, ip });

    const checked = adminStore.checkPassword(u, password);
    if (checked) {
      await adminStore.login(u.id, ip);
      return u.serializer({ exclude: ['password'] });
    } else {
      if (retries >= 4)
        await adminStore.lock(u.id);

      throw new Exception(Code.SERVER_ERROR, '密码错误');
    }
  }

  public async logout(admin_id: number, ip: string) {
    await adminLogStore.add(admin_id, AdminLogType.LOGOUT, admin_id, { ip });
  }

  public async listAdmin(params: any) {
    const { username, page, pageSize } = params;
    const where: any = {};
    if (!_.isNil(username)) _.assign(where, { username })

    const { rows, count } = await adminStore.findAndCountAll({
      where,
      limit: pageSize,
      offset: page * pageSize,
      order: [['id', 'DESC']]
    });

    return {
      list: rows.map(v => v.serializer({ exclude: ['password','secret'] })),
      total: count
    };
  }

  public async addAdmin(admin_id: number, params: any) {
    const { username, password } = params;
    const exist = await adminStore.findByUsername(username);
    Assert(!exist, Code.USER_EXIST, '用户已存在');

    const admin = await adminStore.create({
      username,
      password: hashPassword(password),
      role: Role.ADMIN
    });

    await adminLogStore.add(admin_id, AdminLogType.ADD_ADMIN, admin.id, { username });
    return admin.serializer({ exclude: ['password'] });
  }

  public async removeAdmin(admin_id: number, params: any) {
    const { id } = params;
    const removed = await adminStore.destroy(id);
    Assert(removed, Code.SERVER_ERROR, 'remove admin failed');
    await adminLogStore.add(admin_id, AdminLogType.REMOVE_ADMIN, id, {});
  }

  public async updateAdmin(admin: AdminModel, params: any) {
    const admin_id = _.get(admin, 'id');
    const { id, password, locked } = params;
    const data: any = {};

    Assert(admin_id == id || (admin.power & Power.ADMIN_ACCOUNT) > 0, Code.OPERATION_FORBIDDEN, '权限不够');

    if (!_.isNil(password)) _.assign(data, { password: hashPassword(password) });
    if (!_.isNil(locked)) _.assign(data, { locked });

    const ret = await adminStore.update(id, data);
    Assert(ret, Code.SERVER_ERROR, 'update admin failed');
    
    await adminLogStore.add(admin_id, AdminLogType.EDIT_ADMIN, id, _.omit(data, ['password']));
  }

  public async updatePower(admin_id: number, params: any) {
    const { id, power } = params;
    const ret = await adminStore.update(id, { power });
    Assert(ret, Code.SERVER_ERROR, 'update admin power failed');
    
    await adminLogStore.add(admin_id, AdminLogType.EDIT_ADMIN, id, { power });
  }

  public async statistic() {
    // 1. 会员总人数
    const member_count = await userStore.count();
    // 2. 当前抢单会员人数
    const queue_count = await userQueueStore.count();
    // 3. 商户充值总额
    const merchant_recharge = await merchantStore.sum('total_in_amount');
    // 4. 所有商户充值手续费数量
    const merchant_fee = await merchantStore.sum('total_fee');
    // 5. 招商经理提现总量
    const agent_withdraw = await agentStore.sum('total_withdraw');
    // 6. 会员手续费总量
    const member_fee = await userStatisticStore.sum('total_fee');
    // 7. 当前会员积分总量
    const member_balance = await userWalletStore.sum('balance');
    // 8. 当前商户积分总量
    const merchant_balance = await merchantStore.sum('balance');
    // 9. 会员充值总额
    const member_recharge = await p2pOrderStore.total();

    return {
      member_count,
      queue_count,
      merchant_recharge,
      merchant_fee,
      agent_withdraw,
      member_fee,
      member_balance,
      merchant_balance,
      member_recharge
    };
  }

  public async createAgent(admin_id: number, params: any) {
    const { username, password, name, rate_0, rate_1, rate_2 } = params;
    
    let agent_id = 0;
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const admin = await adminStore.create({
        username,
        password: hashPassword(password),
        role: Role.AGENT
      }, transaction);

      if (!admin) throw new Exception(Code.SERVER_ERROR, '创建招商经理失败');

      const agent = await agentStore.create({
        admin_id: admin.id,
        name,
        rate_0,
        rate_1,
        rate_2
      }, transaction);
      if (!agent) throw new Exception(Code.SERVER_ERROR, '创建招商经理失败');

      agent_id = admin.id;

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      if (e instanceof UniqueConstraintError)
        throw new Exception(Code.SERVER_ERROR, '管理员用户名冲突');

      throw e;
    }

    await adminLogStore.add(admin_id, AdminLogType.ADD_AGENT, agent_id, { username, name, rate_0, rate_1, rate_2 });
  }

  public async createMerchant(admin_id: number, params: any) {
    const { username, password, name, rate_0, rate_1, rate_2, callback } = params;
    const secret = cryptoRandomString({ length: 32, type: 'alphanumeric' });

    let merchant_id = 0;
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const admin = await adminStore.create({
        username,
        password: hashPassword(password),
        role: Role.MERCHANT
      }, transaction);

      if (!admin) throw new Exception(Code.SERVER_ERROR, '创建商户失败');

      merchant_id = admin.id;

      const agent = await merchantStore.create({
        admin_id: admin.id,
        name,
        secret,
        rate_0,
        rate_1,
        rate_2,
        callback
      }, transaction);
      Assert(agent != null, Code.SERVER_ERROR, '创建商户失败');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      if (e instanceof UniqueConstraintError)
        throw new Exception(Code.SERVER_ERROR, '管理员用户名冲突');

      throw e;
    }

    await adminLogStore.add(admin_id, AdminLogType.ADD_MERCHANT, merchant_id, { username, name, rate_0, rate_1, rate_2, callback });
  }

  public async updateMerchant(admin: AdminModel, params: any) {
    const { id } = params;
    const data: any = {};
    let fields = ['name','callback','enabled','agent_id'];
    if (admin.role == Role.ADMIN)
      fields = fields.concat(['rate_0','rate_1','rate_2']);

    fields.forEach(v => {
      if (_.has(params, v))
        _.assign(data, { [v]: params[v] });
    });

    await merchantStore.update(id, data);
  }

  // 列出招商经理
  public listAgent(params: any) {
    const { admin_id, page, pageSize } = params;
    return agentStore.list({ admin_id, page, pageSize });
  }

  // 招商经理详情
  public agent(admin_id: number) {
    return agentStore.findByAdminId(admin_id);
  }

  public async updateAgent(admin_id: number, params: any) {
    const { id } = params;
    const data: any = {};
    const fields = ['name','rate_0','rate_1','rate_2','enabled'];

    fields.forEach(v => {
      if (_.has(params, v))
        _.assign(data, { [v]: params[v] });
    });

    await agentStore.update(id, data);
  }


  // 招商经理提现
  public async agentWithdraw(admin: AdminModel, params: any) {
    const { bank, branch, name, cardno, amount } = params;
    const admin_id = _.get(admin, 'id');
    const { role } = admin;
    Assert(role == Role.AGENT, Code.OPERATION_FORBIDDEN, '你不是招商经理');

    const agent = await agentStore.findByAdminId(admin_id);
    if (!agent) throw new Exception(Code.SERVER_ERROR, '未找到招商经理信息');

    const { balance, freeze } = agent;
    Assert(amount <= np.minus(balance, freeze), Code.OPERATION_FORBIDDEN, '余额不足');

    const exist = await agentWithdrawStore.findByAdminId(admin_id);
    Assert(!exist, Code.OPERATION_FORBIDDEN, '你有未完成的提现单');
    
    let wid = 0;
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const withdraw = await agentWithdrawStore.create({
        admin_id,
        amount,
        bank,
        branch,
        name,
        cardno
      }, transaction);
      if (!withdraw) throw new Exception(Code.SERVER_ERROR, '创建提现单失败');

      wid = withdraw.id;

      const locked = await agentStore.lock(admin_id, amount, transaction);
      Assert(locked, Code.SERVER_ERROR, '余额不足');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    await adminLogStore.add(admin_id, AdminLogType.AGENT_WITHDRAW, wid, { bank, branch, name, cardno, amount });
  }

  // 列出招商经理提现订单
  public listAgentWithdraw(params: any) {
    const { admin_id, active, state, page, pageSize } = params;
    return agentWithdrawStore.list({ admin_id, active, state, page, pageSize });
  }

  public async agentWithdrawPaid(admin: AdminModel, params: any) {
    const { id } = params;
    const admin_id = _.get(admin, 'id');
    const withdraw = await agentWithdrawStore.findById(id);
    if (!withdraw) throw new Exception(Code.BAD_PARAMS, '提现订单不存在');
    const { amount, state } = withdraw;
    Assert(admin.role == Role.ADMIN, Code.OPERATION_FORBIDDEN, '只有管理员才能审核');
    Assert(state == AgentWithdrawState.CREATED, Code.OPERATION_FORBIDDEN, `订单状态错误${state}`);

    const paid = await agentWithdrawStore.pay(id);
    Assert(paid, Code.SERVER_ERROR, '订单已支付失败');

    await adminLogStore.add(admin_id, AdminLogType.AGENT_PAID, id, {});
  }

  // 确认招商经理提现订单
  public async confirmAgentWithdraw(admin_id: number, params: any) {
    const { id } = params;
    const withdraw = await agentWithdrawStore.findById(id);
    if (!withdraw) throw new Exception(Code.BAD_PARAMS, '提现订单不存在');

    Assert(admin_id == withdraw.admin_id, Code.OPERATION_FORBIDDEN, '不是你的提现单');

    const { amount, state } = withdraw;
    Assert(state == AgentWithdrawState.PAID, Code.OPERATION_FORBIDDEN, `订单状态错误${state}`);

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const done = await agentWithdrawStore.confirm(id, transaction);
      Assert(done, Code.SERVER_ERROR, '确认提现单失败');

      const paid = await agentStore.pay(admin_id, amount, amount, transaction);
      Assert(paid, Code.SERVER_ERROR, '为提现方减少余额失败');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    try {
      await agentStore.add(admin_id, { total_withdraw: amount });
    } catch (e) {
      logger.error(`agent add ${admin_id} total_withdraw ${amount} failed`);
    }

    try {
      const agent = await agentStore.findByAdminId(admin_id);
      if (!agent) throw new Exception(Code.SERVER_ERROR, `agent ${admin_id} not found`);
      const { balance } = agent;
      const mlog = {
        admin_id,
        type: MerchantLogType.WITHDRAW,
        amount: np.minus(0, amount),
        before: np.plus(balance, amount),
        after: balance,
        remark: '' + id
      };
      
      await merchantLogStore.bulkCreate([mlog]);
    } catch (e) {
      logger.error(`agent log failed ${e.toString()}`);
    }

    await adminLogStore.add(admin_id, AdminLogType.AGENT_VERIFY_WITHDRAW, id, { amount });
  }

  // 取消招商经理提现订单
  public async revokeAgentWithdraw(admin: AdminModel, params: any) {
    const { id } = params;
    const withdraw = await agentWithdrawStore.findById(id);
    if (!withdraw) throw new Exception(Code.BAD_PARAMS, '提现订单不存在');

    const { admin_id: uid, amount, state } = withdraw;
    Assert(state == AgentWithdrawState.CREATED, Code.OPERATION_FORBIDDEN, `订单状态错误${state}`);

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const done = await agentWithdrawStore.revoke(id, transaction);
      Assert(done, Code.SERVER_ERROR, '取消提现单失败');

      const unlock = await agentStore.unlock(uid, amount, transaction);
      Assert(unlock, Code.SERVER_ERROR, '为提现方减少余额失败');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    await adminLogStore.add(_.get(admin, 'id'), AdminLogType.REVOKE_AGENT_WITHDRAW, uid, { amount });
  }

  // 商户详情
  public merchant(admin_id: number) {
    return merchantStore.findByAdminId(admin_id);
  }

  // 商户冻结/解冻
  public enableMerchant(admin_id: number, params: any) {
    const { enabled } = params;
    return merchantStore.enable(admin_id, enabled);
  }

  // 商户提现申请
  public async merchantWithdraw(admin_id: number, params: any) {
    const { amount, bank, branch, name, cardno } = params;

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const withdraw = await merchantWithdrawStore.create({
        admin_id,
        amount,
        bank,
        branch,
        name,
        cardno
      }, transaction);
      Assert(withdraw != null, Code.SERVER_ERROR, '创建提现单失败');

      const lock = await merchantStore.lock(admin_id, amount, transaction);
      Assert(lock, Code.SERVER_ERROR, '余额不足');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    await adminLogStore.add(admin_id, AdminLogType.MERCHANT_WITHDRAW, admin_id, { amount, bank, branch, name, cardno });
  }

  // 匹配商户提现订单
  public async matchMerchantWithdraw(admin_id: number, params: any) {
    const { rid, wid } = params;
    await orderService.p2pMatch(rid, wid);

    await adminLogStore.add(admin_id, AdminLogType.P2P_MATCH, wid, { rid, wid });
  }

  // 取消商户提现订单
  public revokeMerchantWithdraw(admin_id: number, params: any) {

  }

  // 手工确认商户提现订单
  public async manualMerchantWithdraw(admin_id: number, params: any) {
    const { id } = params;
    const withdraw = await merchantWithdrawStore.findById(id);
    if (!withdraw) throw new Exception(Code.SERVER_ERROR, `order ${id} not exist`);

    const { admin_id: toid, amount, bank, cardno, branch, name } = withdraw;

    let order_id = 0;
    let transaction;
    try {
      transaction = await sequelize.transaction();

      const order = await p2pOrderStore.create({
        uid: 0,
        card_id: 0,
        toid,
        bank,
        branch,
        name,
        cardno,
        amount,
        fee: 0,
        paid: true,
        state: P2pOrderState.MANUAL,
        verified_at: new Date(),
        verified_by: `${admin_id}`
      }, transaction);
      Assert(order != null, Code.SERVER_ERROR, '创建P2P订单失败');
  
      order_id = order.id;

      const paid = await merchantStore.pay(toid, amount, amount, transaction);
      Assert(paid, Code.SERVER_ERROR, '扣除提现方余额失败');

      const removed = await merchantWithdrawStore.remove(id, transaction);
      Assert(removed, Code.SERVER_ERROR, '移除商户提现申请失败')

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    try {
      await merchantStore.add(toid, { total_withdraw: amount });
    } catch (e) {
      logger.error(`merchant add ${toid} total_withdraw ${amount} failed`);
    }

    try {
      const merchant = await merchantStore.findByAdminId(toid);
      if (!merchant) throw new Exception(Code.SERVER_ERROR, `merchant ${toid} not exist`);
      const { balance } = merchant;

      const mlog = {
        admin_id: toid,
        type: MerchantLogType.WITHDRAW,
        amount,
        before: np.plus(balance, amount),
        after: balance,
        remark: '' + order_id
      };

      await merchantLogStore.bulkCreate([mlog]);

    } catch (e) {
      logger.error(`merchant log failed ${e.toString()}`);
    }

    await adminLogStore.add(admin_id, AdminLogType.MANUAL_CONFIRM_MERCHANT_WITHDRAW, id, { toid, amount, bank, cardno, branch, name });
  }

  // 列出会员充值申请
  public async listRecharge(params: any) {
    const { uid, amount, page, pageSize } = params;
    const where: any = {};
    if (!_.isNil(uid)) _.assign(where, { uid });
    if (!_.isNil(amount))
      _.assign(where, { amount_min: { [Op.lte]: amount }, amount_max: { [Op.gte]: amount } });

    const { rows, count } = await userRechargeStore.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      distinct: true,
      include: [{ model: userRepository, required: true }, { model: cardRepository, required: true }],
      order: [['id','DESC']]
    });

    return {
      count,
      rows: rows.map(v => ({ ...v.serializer({ exclude: ['user','card'] }), account: _.get(v, 'user.account'), ..._.pick(v.card, ['bank','name']) }))
    }
  }

  public async revokeRecharge(admin: AdminModel, params: any) {
    const { id } = params;
    const recharge = await userRechargeStore.findById(id);
    if (!recharge) throw new Exception(Code.SERVER_ERROR, '申请不存在');

    const removed = await userRechargeStore.remove(recharge.uid);
    Assert(removed, Code.SERVER_ERROR, '撤销申请失败');
  }

  public listMerchant(params: any) {
    const { admin_id, page, pageSize } = params;
    const where: any = {};
    if (!_.isNil(admin_id)) _.assign(where, { admin_id });

    return merchantStore.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

  // 列出商户提现申请
  public listMerchantWithdraw(params: any) {
    const { admin_id, page, pageSize } = params;
    const where: any = {};
    if (!_.isNil(admin_id)) _.assign(where, { admin_id });

    return merchantWithdrawStore.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

  public async listP2pOrder(admin: AdminModel, params: any) {
    const { uid, admin_id, merchant, state, active, page, pageSize } = params;
    const where: any = {};
    if (!_.isNil(uid)) _.assign(where, { uid });
    if (!_.isNil(admin_id)) _.assign(where, { toid: admin_id });
    if (!_.isNil(state)) {
      _.assign(where, { state });
    } else if (!_.isNil(active)) {
      const st = active ? [ P2pOrderState.CREATED, P2pOrderState.TIMEOUT ] : [ P2pOrderState.FAILED, P2pOrderState.MANUAL, P2pOrderState.REVOKED, P2pOrderState.VERIFIED ];
      _.assign(where, { state: st });
    }

    if (admin.role == Role.MERCHANT) {
      _.assign(where, { toid: _.get(admin, 'id') });
    } else if (!_.isNil(admin_id)) {
      _.assign(where, { toid: admin_id });
    } else if (!_.isNil(merchant)) {
      const m = await adminStore.findByUsername(merchant);
      if (!m) return { rows: [], count: 0 };
      _.assign(where, { toid: _.get(m, 'id') });
    }

    const { rows, count } = await p2pOrderStore.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      distinct: true,
      include: [{ model: userRepository }, { model: adminRepository, required: true }],
      order: [['id','DESC']]
    });

    return {
      count,
      rows: rows.map(v => ({ ...v.serializer({ exclude: ['user','admin'] }), account: _.get(v, 'user.account'), merchant_name: _.get(v, 'admin.username') }))
    };
  }

  // 确认提现到账
  public async confirmP2pOrder(admin: AdminModel, params: any) {
    const admin_id = _.get(admin, 'id');
    const { id, real_amount } = params;
    const order = await p2pOrderStore.findById(id);
    if (!order) throw new Exception(Code.SERVER_ERROR, `order ${id} not exist`);

    const { uid, toid, amount } = order;
    Assert((admin_id == toid && _.isNil(real_amount)) || (admin.role == Role.ADMIN && Power.P2P_ORDER == (admin.power & Power.P2P_ORDER)), Code.OPERATION_FORBIDDEN, '你没有权限确认订单');

    const real = _.defaultTo(real_amount, amount);
    const rate = await configStore.getNumber('recharge_reward', 1);
    const reward = _.floor(np.divide(np.times(rate, real), 1000), 2);
    const add = np.plus(real, reward);

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const done = await p2pOrderStore.confirm(id, admin.username, real, transaction);
      Assert(done, Code.SERVER_ERROR, '确认P2P订单失败');

      const accepted = await userWalletStore.accept(uid, add, transaction);
      Assert(accepted, Code.SERVER_ERROR, '增加充值方余额失败');

      const paid = await merchantStore.pay(toid, real, amount, transaction);
      Assert(paid, Code.SERVER_ERROR, '扣除提现方余额失败');

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      throw e;
    }

    try {
      await merchantStore.add(toid, { total_withdraw: real });
    } catch (e) {
      logger.error(`merchant add ${toid} total_withdraw ${real} failed`);
    }

    try {
      await userStatisticStore.add(uid, { total_recharge: real, total_fee: reward })
    } catch (e) {
      logger.error(`user add ${uid} total_recharge ${real} failed`);
    }

    try {
      const wallet = await userWalletStore.findByUid(uid);
      if (!wallet) throw new Exception(Code.SERVER_ERROR, 'wallet not found');
      const { balance } = wallet;
      const ulog = [
        {
          uid,
          type: UserLogType.RECHARGE,
          amount: real,
          before: np.minus(balance, add),
          after: np.minus(balance, reward),
          remark: '' + id
        },
        {
          uid,
          type: UserLogType.RECHARGE_REWARD,
          amount: reward,
          before: np.minus(balance, reward),
          after: balance,
          remark: '' + id
        }
      ];

      await userLogStore.bulkCreate(ulog);
    } catch (e) {
      logger.error(`user log failed ${e.toString()}`);
    }

    try {
      const merchant = await merchantStore.findByAdminId(toid);
      if (!merchant) throw new Exception(Code.SERVER_ERROR, `merchant ${toid} not exist`);
      const { balance } = merchant;

      const mlog = {
        admin_id: toid,
        type: MerchantLogType.WITHDRAW,
        amount: real,
        before: np.plus(balance, real),
        after: balance,
        remark: '' + id
      };

      await merchantLogStore.bulkCreate([mlog]);
    } catch (e) {
      logger.error(`merchant log failed ${e.toString()}`);
    }

    await adminLogStore.add(admin_id, AdminLogType.CONFIRM_P2P_ORDER, id, { admin_id, uid, toid, amount: real, reward });
  }

  public async revokeP2pOrder(admin_id: number, params: any) {
    const { id } = params;
    const order = await p2pOrderStore.findById(id);
    if (!order) throw new Exception(Code.BAD_PARAMS, 'order not found');

    const { uid, amount, fee, toid, paid } = order;
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

    await adminLogStore.add(admin_id, AdminLogType.REVOKE_P2P_ORDER, id, { uid, toid, amount, paid });
  }

  

  // 恢复P2P匹配订单
  public renewP2pOrder(admin_id: number, params: any) {

  }

  // 列出会员
  public async listUser(params: any) {
    const { page, pageSize } = params;
    const { rows, count } = await userStore.findAndCountAll({
      offset: page * pageSize,
      limit: pageSize,
      distinct: true,
      include: [{ model: userWalletRepository, required: true }, { model: userStatisticRepository, required: true }],
      order: [['id','DESC']]
    });

    const us = rows.map(v => {
      return {
        ...v.serializer({ exclude: ['wallet', 'statistic'] }),
        ..._.pick(v.wallet, ['balance','freeze']),
        ..._.pick(v.statistic, ['total_fee','total_in_amount'])
      };
    });

    return { rows: us, count };
  }

  // 编辑会员
  public async editUser(admin_id: number, params: any) {
    const { uid, enabled, level } = params;
    const ret = await userStore.update(uid, { enabled, level });

    await adminLogStore.add(admin_id, AdminLogType.EDIT_USER, uid, { enabled, level });
  }

  public async listOrder(admin: AdminModel, params: any) {
    const { merchant_id, orderid, uid, state, active, start, end, page, pageSize } = params;
    const where: any = {};

    const admin_id = _.get(admin, 'id');
    const { role } = admin;
    if (role == Role.MERCHANT) {
      const merchant = await merchantStore.findByAdminId(admin_id);
      if (!merchant) throw new Exception(Code.SERVER_ERROR, '商户不存在');
      _.assign(where, { merchant_id: _.get(merchant, 'id') });
    } else if (!_.isNil(merchant_id)) {
      _.assign(where, { merchant_id });
    }

    if (!_.isNil(orderid)) _.assign(where, { orderid });
    if (!_.isNil(uid)) _.assign(where, { uid });
    if (!_.isNil(state))
      _.assign(where, { state });
    else if (!_.isNil(active)) {
      _.assign(where, { state: (active ? [ OrderState.CREATED, OrderState.MATCH, OrderState.VERIFIED ] : [ OrderState.TIMEOUT, OrderState.FAIL, OrderState.CANCEL ]) });
    }

    if (!_.isNil(start) && !_.isNil(end)) {
      _.assign(where, { createdAt: { [Op.between]: [ start, end ] } });
    }

    const total = await orderStore.sum(where);
    const { rows, count } = await orderStore.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      distinct: true,
      include: [{ model: userRepository }, { model: merchantRepository, required: true, distinct: true, include: [ { model: adminRepository, required: true } ] }],
      order: [['id','DESC']]
    });

    return {
      total,
      count,
      rows: rows.map(v => ({ ...v.serializer({ exclude: ['user','merchant'] }), account: _.get(v, 'user.account'), merchant_name: _.get(v, 'merchant.admin.username') })),
    };
  }

  public async confirmOrder(admin_id: number, params: any) {
    const { id, real_amount } = params;
    const order = await orderStore.findById(id);
    if (!order) throw new Exception(Code.SERVER_ERROR, 'order not found');

    const { uid } = order;
    const u = await userStore.findById(uid);
    if (!u) throw new Exception(Code.SERVER_ERROR, 'user not found');

    await orderService.confirm(u, { id, real: real_amount });
    await adminLogStore.add(admin_id, AdminLogType.CONFIRM_ORDER, id, { real_amount });
  }

  public async manualCallback(admin_id: number, params: any) {
    const { id } = params;
    const order = await orderStore.findById(id);
    if (!order) throw new Exception(Code.SERVER_ERROR, 'order not found');

    const { orderid, amount, real_amount, merchant_id, state } = order;
    Assert(state == OrderState.VERIFIED, Code.OPERATION_FORBIDDEN, '订单必须是已完成状态');

    const merchant = await merchantStore.findById(merchant_id);
    if (!merchant) throw new Exception(Code.SERVER_ERROR, 'merchant not found');

    const { callback, secret } = merchant;

    await orderService.callback({
      id,
      orderid,
      amount,
      real_amount,
      result: 1,
      callback,
      secret
    });
  }

  public revokeOrder(admin_id: number, params: any) {

  }

  public async renewOrder(admin_id: number, params: any) {
    const { id } = params;
    const order = await orderStore.findById(id);
    if (!order) throw new Exception(Code.SERVER_ERROR, '订单不存在');

    const { uid, amount } = order;

    let transaction;
    try {
      transaction = await sequelize.transaction();

      const userlock = await userLockStore.add({
        uid, amount, order_id: id
      }, transaction);
      Assert(userlock != null, Code.SERVER_ERROR, 'user lock failed');

      const lock = await userWalletStore.lock(uid, amount, transaction);
      Assert(lock, Code.OPERATION_FORBIDDEN, '会员余额不够，无法恢复订单');

      const done = await orderStore.renew(id, transaction);
      Assert(done, Code.SERVER_ERROR, `order ${id} renew failed`);

      await transaction.commit();
    } catch (e) {
      await transaction?.rollback();
      if (e instanceof UniqueConstraintError)
        throw new Exception(Code.OPERATION_FORBIDDEN, '订单金额互斥，无法恢复');

      throw e;
    }

    await userService.notify(uid, NotifyType.NEW_ORDER);
  }

  public listUserWithdraw(params: any) {
    const { uid, state, page, pageSize } = params;
    return userWithdrawStore.findAndCountAll({
      uid, state, page, pageSize
    });
  }

  public async withdrawPaid(admin_id: number, params: any) {
    const { id } = params;
    const withdraw = await userWithdrawStore.findById(id);
    if (!withdraw) throw new Exception(Code.BAD_PARAMS, '提现订单不存在');

    Assert(withdraw.state == UserWithdrawState.CREATED, Code.SERVER_ERROR, '订单状态错误');
  
    const { uid } = withdraw;

    await orderService.confirmWithdraw(uid, { id });

    await adminLogStore.add(admin_id, AdminLogType.USER_WITHDRAW_PAID, uid, {});

    await userService.notify(uid, NotifyType.WITHDRAW_PAID);
  }

  public async revokeUserWithdraw(admin_id: number, params: any) {
    const { id } = params;
    await orderService.revokeWithdraw(id, admin_id);

    await adminLogStore.add(admin_id, AdminLogType.REVOKE_USER_WITHDRAW, id, {});
  }

  public listUserLog(params: any) {
    const { uid, type, page, pageSize } = params;
    return userLogStore.findAndCountAll({
      uid,
      type,
      page,
      pageSize
    });
  }

  public async listMerchantLog(params: any) {
    const { admin_id, type, page, pageSize } = params;
    const { rows, count } = await merchantLogStore.findAndCountAll({
      admin_id,
      type,
      page,
      pageSize
    });

    return {
      count,
      rows: rows.map(v => ({ ...v.serializer({ exclude: ['admin'] }), merchant_name: v.admin.username }))
    };
  }

  public listAdminLog(params: any) {
    const { admin_id, type, page, pageSize } = params;
    return adminLogStore.findAndCountAll({
      admin_id,
      type,
      page,
      pageSize
    });
  }

  public listLevel() {
    return levelStore.list();
  }

  public updateLevel(admin_id: number, params: any) {
    const { level, rate_0, rate_1, rate_2 } = params;
    return levelStore.update(level, { rate_0, rate_1, rate_2 });
  }

  public async setWebsite(admin_id: number, params: any) {
    const {
      web_status,
      sms_enable,
      register,
      match_min,
      withdraw_rate
    } = params;

    if (!_.isNil(web_status)) await configStore.set('web_status', web_status);
    if (!_.isNil(sms_enable)) await configStore.set('sms_enable', sms_enable);
    if (!_.isNil(register)) await configStore.set('register', register);
    if (!_.isNil(match_min)) await configStore.set('match_min', match_min);
    if (!_.isNil(withdraw_rate)) await configStore.set('withdraw_rate', withdraw_rate);

    await configStore.flush();
  }

  public async addWebSiteConfig(admin_id: number, params: any) {
    const { name, value } = params;
    await configStore.create({ name, value });
    await configStore.flush();
  }

  public async updateWebSiteConfig(admin_id: number, params: any) {
    const { id, name, value } = params;
    await configStore.update({ name, value }, id);
    await configStore.flush()
  }

  public getWebsiteConfigList() {
    return configStore.getAll();
  }

  public async getWebsite() {
    const rows: any = await configStore.getAll();
    const data: {[k: string]: any} = {};
    for (const v of rows) {
      data[v.get('name')] = v.get('value');
    }

    return data;
  }

  public async balance(admin_id: number, params: any) {
    const { type, id, balance } = params;
    Assert(balance != 0, Code.BAD_PARAMS, '金额不能为0');

    let updated = false;
    let before = 0;
    let mid = 0;
    if (type == 0) {
      const w = await userWalletStore.findByUid(id);
      if (!w) throw new Exception(Code.BAD_PARAMS, `会员${id}不存在`);

      before = w.balance;

      if (balance > 0) {
        updated = await userWalletStore.accept(id, balance);
      } else {
        updated = await userWalletStore.pay(id, np.minus(0, balance), 0);
      }
    } else if (type == 1) {
      const m = await merchantStore.findById(id);
      if (!m) throw new Exception(Code.BAD_PARAMS, `商户${id}不存在`);

      before = m.balance;
      mid = m.admin_id;

      if (balance > 0) {
        updated = await merchantStore.accept(m.admin_id, balance);
      } else {
        updated = await merchantStore.pay(m.admin_id, np.minus(0, balance), 0);
      }
    } else if (type == 2) {
      const a = await agentStore.findById(id);
      if (!a) throw new Exception(Code.BAD_PARAMS, `招商经理${id}不存在`);

      before = a.balance;
      mid = a.admin_id;

      if (balance > 0) {
        updated = await agentStore.accept(a.admin_id, balance);
      } else {
        updated = await agentStore.pay(a.admin_id, np.minus(0, balance), 0);
      }
    }

    Assert(updated, Code.SERVER_ERROR, '更新余额失败');

    if (type == 0) {
      const ulogs = [
        {
          uid: id,
          type: UserLogType.ADMIN_ADD,
          amount: balance,
          before,
          after: np.plus(before, balance),
          remark: '' + admin_id
        }
      ];

      await userLogStore.bulkCreate(ulogs);
    } else {
      const mlogs = [
        {
          admin_id: mid,
          type: MerchantLogType.ADMIN_ADD,
          amount: balance,
          before,
          after: np.plus(before, balance),
          remark: '' + admin_id
        }
      ];

      await merchantLogStore.bulkCreate(mlogs);
    }

    await adminLogStore.add(admin_id, AdminLogType.SET_BALANCE, id, { type, balance });
  }

  public listCards(params: any) {
    const { uid, type, cardno, enabled, state, page, pageSize } = params;
    const where: any = {};
    if (!_.isNil(uid)) _.assign(where, { uid });
    if (!_.isNil(type)) _.assign(where, { type });
    if (!_.isNil(cardno)) _.assign(where, { cardno });
    if (!_.isNil(enabled)) _.assign(where, { enabled });
    if (!_.isNil(state)) _.assign(where, { state });

    return cardStore.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id', 'DESC']]
    });
  }

  public updateCard(admin_id: number, params: any) {
    const { id } = params;
    const fields = [
      'type',
      'bank',
      'branch',
      'name',
      'cardno',
      'qrcode',
      'enabled',
      'state'
    ];

    const data: any = {};
    fields.forEach(v => {
      if (_.has(params, v))
        _.assign(data, { [v]: params[v] });
    });

    return cardStore.update(id, data);
  }

  public listAdminIp(params: any) {
    const { admin_id, page, pageSize } = params;
    const where: any = {};
    if (!_.isNil(admin_id)) _.assign(where, { uid: admin_id });

    return adminAllowIpStore.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id', 'DESC']]
    });
  }

  public async addAdminIp(admin_id: number, params: any) {
    const { admin_id: uid, ip } = params;
    const data = await adminAllowIpStore.create(uid, ip);
    Assert(data != null, Code.SERVER_ERROR, '增加管理员IP失败');
    await adminLogStore.add(admin_id, AdminLogType.ADD_IP, uid, { uid, ip });
  }

  public async delAdminIp(admin_id: number, params: any) {
    const { id } = params;
    const allowIp = await adminAllowIpStore.findById(id);
    if (!allowIp) throw new Exception(Code.BAD_PARAMS, '管理员IP记录不存在');

    const { uid, ip } = allowIp;
    const row = await adminAllowIpStore.remove(id);
    Assert(row == 1, Code.SERVER_ERROR, '删除管理员IP失败');
    await adminLogStore.add(admin_id, AdminLogType.DEL_IP, id, { uid, ip });
  }

}

export const adminService = new AdminService();
