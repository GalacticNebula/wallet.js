import _ from 'lodash';
import { UniqueConstraintError } from 'sequelize';
import mysql from '@common/dbs/mysql';
import BaseService from './base.service';
import {
  userSessionStore,
  configStore,
  redisStore,
  userStore,
  userAuthStore,
  userWalletStore, UserAuthType
} from '@store/index';
import { Code } from '@common/enums';
import { Assert, Exception } from '@common/exceptions';
import { hashPassword, captchas, sendSms, env } from '@common/utils';
import { PROJECT_NAME } from '@common/constants';
import { userStatisticStore } from '@store/user_statistic.store';

const SMS_PREFIX = `${PROJECT_NAME}:sms:`;
const SMS_OUT_PREFIX = `${PROJECT_NAME}:sms_out:`;

class AuthService extends BaseService {

  public async updateSession(id: number, key: string, sess: any) {
    return userSessionStore.update(id, key, sess);
  }

  public async getSession(key: string) {
    return userSessionStore.getOne(key);
  }

  public async destroySession(key: string) {
    await userSessionStore.destroy(key);
  }

  public async checkSMS(phone: string, code: string) {
    const msm = await configStore.getNumber('sms_enable', 0);
    if (msm == 0)
      return true;

    const key = SMS_PREFIX + phone;
    const scode = await redisStore.get(key);
    if (_.isEmpty(scode))
      return false;

    await redisStore.del(key);
    return scode == code;
  }

  public async register(params: any) {
    const { phone, password, invitecode, scode } = params;

    const can = await configStore.getNumber('register', 0);
    Assert(can !== 0, Code.REGISTER_CLOSED, '注册关闭');

    const checked = await this.checkSMS(phone, scode);
    Assert(checked, Code.INVALID_SMS_CODE, '短信验证码错误');

    const parent = await userStore.findByInviteCode(invitecode);
    if (parent == null) throw new Exception(Code.INVALID_INVITE_CODE, '邀请码未找到');

    const account = phone;
    let u: any = null;
    let done = false;
    let retries = 3;
    do {
      const code = '' + _.random(10000000, 99999999);
      let transaction;
      try {
        transaction = await mysql.transaction();
        u = await userStore.create({
          account,
          invitecode: code,
          pid: parent.id,
          last_login: new Date()
        }, transaction);

        const uid = u.id;

        await userAuthStore.create({
          uid,
          account,
          password: hashPassword(password)
        }, transaction);

        await userWalletStore.create(uid, transaction);
        await userStatisticStore.create(uid, transaction);

        await transaction.commit();
        done = true;
        break;
      } catch (e) {
        await transaction?.rollback();
        if (e instanceof UniqueConstraintError) {
          Assert(!_.has(e.fields, 'account-type'), Code.USERNAME_EXIST, '账号已存在');
          if (_.has(e.fields, 'invitecode'))
            continue;
        }

        throw e;
      }
    } while (retries-- > 0);

    Assert(done, Code.SERVER_ERROR, '创建账号失败，请重试');

    return u.serializer();
  }

  public async login(params: any) {
    const { phone, password } = params;
    const webStatus = await configStore.getNumber('web_status', 0);
    Assert(webStatus > 0, Code.SERVER_ERROR, '服务器维护中');

    const ua = await userAuthStore.login(phone);
    if (!ua) throw new Exception(Code.USERNAME_NOT_FOUND, '账号不存在');
    Assert(hashPassword(password) == ua.password, Code.INVALID_PASSWORD, '密码错误');

    const u = await userStore.info(ua.uid);
    if (!u) throw new Exception(Code.SERVER_ERROR, '账号不存在');
    Assert(u.enabled, Code.OPERATION_FORBIDDEN, '账号已冻结，请联系客服');

    return u.serializer();
  }

  public async changePassword(uid: number, params: any) {
    const { old, password } = params;
    const ua = await userAuthStore.findByUid(uid);
    if (!ua) throw new Exception(Code.SERVER_ERROR, '账号不存在');
    Assert(hashPassword(old) == ua.password, Code.INVALID_PASSWORD, '密码错误');

    const done = await userAuthStore.changePasswd(uid, hashPassword(password));
    Assert(done, Code.SERVER_ERROR, '修改密码失败');
  }

  public async resetPasswd(params: any) {
    const { phone, password, scode } = params;
    const msm = await configStore.getNumber('sms_enable', 0);
    Assert(msm == 0 || await this.checkSMS(phone, scode), Code.INVALID_SMS_CODE, '短信验证码错误');
    
    const ua = await userAuthStore.findOne(phone, UserAuthType.PHONE);
    Assert(ua != null, Code.BAD_PARAMS, '手机号未注册');

    const ret = await userAuthStore.resetPasswd(phone, UserAuthType.PHONE, hashPassword(password));
    Assert(ret, Code.SERVER_ERROR, '重置密码错误');
  }

  public async sendSms(params: any) {
    const { phone } = params;
    const msm = await configStore.getNumber('sms_enable', 0);
    if (msm == 0)
      return;

    const valid = await redisStore.exists(SMS_OUT_PREFIX + phone);
    Assert(!valid, Code.SMS_FREQUENTLY, '请1分钟之后再次发送!');

    const code = '' + _.random(100000, 999999);
    await redisStore.setex(SMS_OUT_PREFIX + phone, code, 60);
    await redisStore.setex(SMS_PREFIX + phone, code, 300);

    const content = `您的验证码是：${code}，有效期5分钟。`;

    const sent = await sendSms({
      key: env.get('SMS_KEY'),
      secret: env.get('SMS_SECRET'),
      phone,
      content
    });

    Assert(sent, Code.SERVER_ERROR, '服务器繁忙,请重新发送');
  }

  public async getCaptcha() {
    return captchas.create();
  }

}

export const authService = new AuthService();
