import _ from 'lodash';
import BaseService from './base.service';
import {
  adminStore,
  adminLogStore,
  adminAllowIpStore,
  AdminLogType,
  configStore
} from '@store/index';
import { captchas, hashPassword, is_testMode } from '@common/utils';
import { Assert, Exception } from '@common/exceptions';
import { Code } from '@common/enums';
import { AdminModel } from '@models/admin.model';

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
    if (!u) throw new Exception(Code.SERVER_ERROR, '账户不存在');

    const allowIps = u.allowIps.map(v => v.ip);
    if (!is_testMode() && !allowIps.includes(ip))
      throw new Exception(Code.SERVER_ERROR, 'IP不允许被登录，请联系管理员.');

    const { locked, retries } = u;
    Assert(!locked, Code.SERVER_ERROR, '账户已锁定，请联系管理员');

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
    Assert(!exist, Code.SERVER_ERROR, '用户已存在');

    const admin = await adminStore.create({
      username,
      password: hashPassword(password)
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

  public listAdminLog(params: any) {
    const { admin_id, type, page, pageSize } = params;
    return adminLogStore.findAndCountAll({
      admin_id,
      type,
      page,
      pageSize
    });
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
