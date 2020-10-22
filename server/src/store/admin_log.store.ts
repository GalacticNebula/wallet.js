import _ from 'lodash';
import BaseStore from './base.store';
import { adminLogRepository } from '@models/index';

export enum AdminLogType {
  LOGIN = 0,
  LOGOUT = 1,
  ADD_ADMIN = 2,
  REMOVE_ADMIN = 3,
  EDIT_ADMIN = 4,
  ADD_AGENT = 5,
  ADD_MERCHANT = 6,
  AGENT_WITHDRAW = 7,
  MERCHANT_WITHDRAW = 8,
  AGENT_PAID = 9,
  AGENT_VERIFY_WITHDRAW = 10,
  REVOKE_AGENT_WITHDRAW = 11,
  P2P_MATCH = 12,
  MANUAL_CONFIRM_MERCHANT_WITHDRAW = 13,
  CONFIRM_P2P_ORDER = 14,
  EDIT_USER = 15,
  USER_WITHDRAW_PAID = 16,
  REVOKE_USER_WITHDRAW = 17,
  CONFIRM_ORDER = 18,
  SET_BALANCE = 19,
  ADD_IP = 20,
  DEL_IP = 21,
  REVOKE_P2P_ORDER = 22
}

class AdminLogStore extends BaseStore {

  public add(admin_id: number, type: AdminLogType, target_id: number, params: any) {
    return adminLogRepository.create({
      admin_id,
      type,
      target_id,
      params
    });
  }

  public bulkCreate(data: any[]) {
    return adminLogRepository.bulkCreate(data);
  }

  public findAndCountAll(options: any) {
    const { admin_id, type, page, pageSize } = options;
    const where: any = {};
    if (!_.isNil(admin_id)) _.assign(where, { admin_id });
    if (!_.isNil(type)) _.assign(where, { type });

    return adminLogRepository.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

}

export const adminLogStore = new AdminLogStore();
