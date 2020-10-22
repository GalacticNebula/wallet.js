import * as _ from 'lodash';
import { Transaction } from 'sequelize';
import BaseStore from './base.store';
import { userWithdrawRepository } from '@models/index';

export enum UserWithdrawState {
  CREATED = 0,
  PAID = 1,
  VERIFIED = 2,
  REVOKED = 3
}

class UserWithdrawStore extends BaseStore {

  public findById(id: number) {
    return userWithdrawRepository.findByPk(id);
  }

  public findByUid(uid: number) {
    return userWithdrawRepository.findOne({
      where: { uid, state: UserWithdrawState.CREATED }
    });
  }

  public list(options: any) {
    const { uid, state, active, page = 0, pageSize = 10 } = options;
    const where: any = {};
    if (!_.isNil(uid)) _.assign(where, { uid }); 
    if (!_.isNil(state))
      _.assign(where, { state });
    else if (!_.isNil(active)) {
      _.assign(where, { 
        state: (active ? [ UserWithdrawState.CREATED, UserWithdrawState.PAID ] : [ UserWithdrawState.VERIFIED, UserWithdrawState.REVOKED ])
      });
    }

    return userWithdrawRepository.findAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

  public findAndCountAll(options: any) {
    const { uid, state, active, page = 0, pageSize = 10 } = options;
    const where: any = {};
    if (!_.isNil(uid)) _.assign(where, { uid }); 
    if (!_.isNil(state))
      _.assign(where, { state });
    else if (!_.isNil(active)) {
      _.assign(where, { 
        state: (active ? [ UserWithdrawState.CREATED, UserWithdrawState.PAID ] : [ UserWithdrawState.VERIFIED, UserWithdrawState.REVOKED ])
      });
    }

    return userWithdrawRepository.findAndCountAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

  public create(data: any, transaction?: Transaction) {
    return userWithdrawRepository.create(data, { transaction });
  }

  public async confirm(id: number, transaction?: Transaction) {
    const [ rows ] = await userWithdrawRepository.update({
      state: UserWithdrawState.VERIFIED
    }, {
      where: { id, state: UserWithdrawState.CREATED },
      transaction
    });

    return rows === 1;
  }

  public async revoke(id: number, transaction?: Transaction) {
    const [ rows ] = await userWithdrawRepository.update({
      state: UserWithdrawState.REVOKED
    }, {
      where: { id, state: UserWithdrawState.CREATED },
      transaction
    });

    return rows === 1;
  }

  public async pay(id: number, transaction?: Transaction) {
    const [ rows ] = await userWithdrawRepository.update({
      state: UserWithdrawState.PAID
    }, {
      where: { id, state: UserWithdrawState.CREATED },
      transaction
    });

    return rows === 1;
  }

}

export const userWithdrawStore = new UserWithdrawStore();
