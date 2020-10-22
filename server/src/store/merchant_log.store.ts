import _ from 'lodash';
import BaseStore from './base.store';
import { merchantLogRepository } from '@models/index';
import { np } from '@common/utils';

export enum MerchantLogType {
  RECHARGE = 0,
  WITHDRAW = 1,
  ACCEPT_REWARD = 2,
  ADMIN_ADD = 3
}

class MerchantLogStore extends BaseStore {

  public add(admin_id: number, type: MerchantLogType, before: number, amount: number, remark?: string) {
    const data: any = {
      admin_id,
      type,
      before,
      amount,
      after: np.plus(before, amount)
    };

    if (!_.isNil(remark))
      _.assign(data, { remark });

    return merchantLogRepository.create(data);
  }

  public bulkCreate(data: any[]) {
    return merchantLogRepository.bulkCreate(data);
  }

  public findAndCountAll(options: any) {
    const { admin_id, type, page, pageSize } = options;
    const where: any = {};
    if (!_.isNil(admin_id)) _.assign(where, { admin_id });
    if (!_.isNil(type)) _.assign(where, { type });

    return merchantLogRepository.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      include: ['admin'],
      order: [['id','DESC']]
    });
  }

}

export const merchantLogStore = new MerchantLogStore();
