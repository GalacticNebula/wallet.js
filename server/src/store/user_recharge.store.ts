import * as _ from 'lodash';
import { Transaction } from 'sequelize';
import BaseStore from './base.store';
import { userRechargeRepository } from '@models/index';

class UserRechargeStore extends BaseStore {

  public findById(id: number) {
    return userRechargeRepository.findByPk(id);
  }

  public findByUid(uid: number) {
    return userRechargeRepository.findAll({
      where: { uid }
    });
  }

  public findAll(options: any) {
    return userRechargeRepository.findAll(options);
  }

  public findAndCountAll(options: any) {
    return userRechargeRepository.findAndCountAll(options);
  }

  public async exist(uid: number) {
    const row = await userRechargeRepository.findOne({
      where: { uid }
    });

    return row != null;
  }

  public create(data: any) {
    return userRechargeRepository.create(data);
  }

  public async remove(uid: number, transaction?: Transaction) {
    const rows = await userRechargeRepository.destroy({ where: { uid }, transaction });
    return rows === 1;
  }

}

export const userRechargeStore = new UserRechargeStore();
