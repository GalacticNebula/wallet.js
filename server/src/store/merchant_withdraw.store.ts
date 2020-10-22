import * as _ from 'lodash';
import { Transaction } from 'sequelize';
import BaseStore from './base.store';
import { merchantWithdrawRepository } from '@models/index';

class MerchantWithdrawStore extends BaseStore {

  public findById(id: number) {
    return merchantWithdrawRepository.findByPk(id);
  }

  public findAll(options: any) {
    return merchantWithdrawRepository.findAll(options);
  }

  public findAndCountAll(options: any) {
    return merchantWithdrawRepository.findAndCountAll(options);
  }

  public create(data: any, transaction?: Transaction) {
    return merchantWithdrawRepository.create(data, { transaction });
  }

  public async remove(id: number, transaction?: Transaction) {
    const rows = await merchantWithdrawRepository.destroy({ where: { id }, transaction });
    return rows === 1;
  }

}

export const merchantWithdrawStore = new MerchantWithdrawStore();
