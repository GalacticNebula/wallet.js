import * as _ from 'lodash';
import { Transaction } from 'sequelize';
import BaseStore from './base.store';
import { userLockRepository } from '@models/index';

class UserLockStore extends BaseStore {

  public find(uid: number, amount: number) {
    return userLockRepository.findOne({
      where: {
        uid,
        amount
      }
    });
  }

  public add(data: any, transaction?: Transaction) {
    return userLockRepository.create(data, { transaction });
  }

  public async remove(order_id: number, transaction?: Transaction) {
    const rows = await userLockRepository.destroy({
      where: { order_id },
      transaction
    });

    return rows === 1;
  }

}

export const userLockStore = new UserLockStore();
