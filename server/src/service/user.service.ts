import _ from 'lodash';
import BaseService from './base.service';
import { cardStore, configStore, redisStore, userLogStore, userQueueStore, userStore, userWalletStore } from '@store/index';
import { orderService } from './order.service';
import { Assert, Exception } from '@common/exceptions';
import { Code, NotifyType } from '@common/enums';
import { UserModel } from '@models/user.model';
import { PROJECT_NAME } from '@common/constants';

class UserService extends BaseService {

  public toggleOnline(uid: number, params: any) {
    const { status } = params;
    return userStore.toggleOnline(uid, !!status);
  }

  public async toggleWorking(uid: number, params: any) {
    const { status } = params;
    const working = !!status;
    if (!working) {
      await orderService.dequeue(uid);
      return { status: 0 };
    }

    const canWork = await cardStore.canWork(uid);
    Assert(canWork, Code.OPERATION_FORBIDDEN, '您尚未启动卡');

    const match_min = await configStore.getNumber('match_min', 100);
    const balance = await userWalletStore.balance(uid);
    Assert(balance >= match_min, Code.OPERATION_FORBIDDEN, `您的余额不足`);

    await orderService.enqueue(uid);
    return { status: 1, start_at: new Date() };
  }

  public async working(uid: number, params: any) {
    const uq = await userQueueStore.findByUid(uid);
    if (!uq) return { status: 0 };

    const { start_at } = uq;
    return {
      status: 1,
      start_at
    };
  }

  public info(uid: number, params: any) {
    return userStore.info(uid);
  }

  public listRecord(uid: number, params: any) {
    const { type, page, pageSize } = params;
    return userLogStore.findAll({ uid, type, page, pageSize });
  }

  public listChildren(uid: number, params: any) {
    const { page, pageSize } = params;
    return userStore.findAll({
      where: { pid: uid },
      offset: page * pageSize,
      limit: pageSize,
      distinct: true,
      include: ['statistic'],
      order: [['id','DESC']]
    });
  }

  public async editChild(u: UserModel, params: any) {
    const uid = _.get(u, 'id');
    const { uid: id, level } = params;
    const child = await userStore.findById(id);
    if (!child) throw new Exception(Code.BAD_PARAMS, `下级${id}不存在`);
    Assert(child.pid == uid, Code.OPERATION_FORBIDDEN, '${id}不是你的下级');
    Assert(level < u.level, Code.OPERATION_FORBIDDEN, '必须低于你的等级');

    const up = await userStore.update(id, { level });
    Assert(up, Code.SERVER_ERROR, '设置等级失败');
  }

  public async notify(uid: number, type: NotifyType) {
    const key = `${PROJECT_NAME}:notify`;
    await redisStore.zincrby(key, Math.pow(10, type), `${uid}`);
  }

  public async getNotify(uid: number, params: any) {
    const key = `${PROJECT_NAME}:notify`;
    const score = _.defaultTo(Number(await redisStore.zscore(key, `${uid}`)), 0);

    await redisStore.zrem(key, [ `${uid}` ]);
    return { notify: score };
  }

}

export const userService = new UserService();
