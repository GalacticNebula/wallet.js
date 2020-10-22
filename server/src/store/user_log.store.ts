import _ from 'lodash';
import BaseStore from './base.store';
import { userLogRepository } from '@models/index';
import { np } from '@common/utils';

export enum UserLogType {
  RECHARGE = 0,
  WITHDRAW = 1,
  ACCEPT = 2,
  ACCEPT_REWARD = 3,
  ADMIN_ADD = 4,
  PARENT_REWARD = 5,
  RECHARGE_REWARD = 6
}

class UserLogStore extends BaseStore {

  public add(uid: number, type: UserLogType, before: number, amount: number, remark?: string) {
    const data: any = {
      uid,
      type,
      before,
      amount,
      after: np.plus(before, amount)
    };

    if (!_.isNil(remark))
      _.assign(data, { remark });

    return userLogRepository.create(data);
  }

  public bulkCreate(data: any[]) {
    return userLogRepository.bulkCreate(data);
  }

  public findAll(options: any) {
    const { uid, type, page, pageSize } = options;
    const where: any = {};
    if (!_.isNil(uid)) _.assign(where, { uid });
    if (!_.isNil(type)) _.assign(where, { type });

    return userLogRepository.findAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

  public findAndCountAll(options: any) {
    const { uid, type, page, pageSize } = options;
    const where: any = {};
    if (!_.isNil(uid)) _.assign(where, { uid });
    if (!_.isNil(type)) _.assign(where, { type });

    return userLogRepository.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

}

export const userLogStore = new UserLogStore();
