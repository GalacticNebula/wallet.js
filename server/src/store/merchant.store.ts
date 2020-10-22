import * as _ from 'lodash';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import BaseStore from './base.store';
import { merchantRepository } from '@models/index';
import { np } from '@common/utils';

class MerchantStore extends BaseStore {

  public findById(id: number) {
    return merchantRepository.findByPk(id);
  }

  public findByAdminId(admin_id: number) {
    return merchantRepository.findOne({
      where: { admin_id }
    });
  }

  public findAndCountAll(options: any) {
    return merchantRepository.findAndCountAll(options);
  }

  public create(data: any, transaction?: Transaction) {
    return merchantRepository.create(data, { transaction });
  }

  public async enable(admin_id: number, enabled: boolean) {
    const [ rows ] = await merchantRepository.update({
      enabled
    }, {
      where: { admin_id }
    });

    return rows === 1;
  }

  public async pay(admin_id: number, amount: number, freeze: number, transaction?: Transaction) {
    const data: any = { balance: Sequelize.literal(`balance-${amount}`) };
    const where: any = { admin_id, balance: { [Op.gte]: Sequelize.literal(`freeze+${np.minus(amount, freeze)}`) } };
    if (freeze > 0) {
      _.assign(data, { freeze: Sequelize.literal(`freeze-${freeze}`) });
      _.assign(where, { freeze: { [Op.gte]: freeze } });
    }

    const [ rows ] = await merchantRepository.update(data, {
      where,
      transaction
    });

    return rows === 1;
  }

  public async accept(admin_id: number, amount: number, transaction?: Transaction) {
    const [ rows ] = await merchantRepository.update({
      balance: Sequelize.literal(`balance+${amount}`)
    }, {
      where: { admin_id },
      transaction
    });

    return rows === 1;
  }

  public async lock(admin_id: number, amount: number, transaction?: Transaction) {
    const [ rows ] = await merchantRepository.update({
      freeze: Sequelize.literal(`freeze+${amount}`)
    }, {
      where: { admin_id, balance: { [Op.gte]: Sequelize.literal(`freeze+${amount}`) } },
      transaction
    });

    return rows === 1;
  }

  public async unlock(admin_id: number, amount: number, transaction?: Transaction) {
    const [ rows ] = await merchantRepository.update({
      freeze: Sequelize.literal(`freeze-${amount}`)
    }, {
      where: { admin_id, freeze: { [Op.gte]: amount } },
      transaction
    });

    return rows === 1;
  }

  public async add(admin_id: number, values: any) {
    const fields = [
      'total_in_amount',
      'total_in_orders',
      'total_fee',
      'total_withdraw'
    ];

    const data: any = {};
    fields.forEach(v => {
      if (_.has(values, v))
        _.assign(data, { [v]: Sequelize.literal(`${v}+${values[v]}`) })
    });

    const [ rows ] = await merchantRepository.update(data, {
      where: { admin_id }
    });

    return rows === 1;
  }

  public sum(field: 'total_in_amount' | 'total_in_orders' | 'total_fee' | 'total_withdraw' | 'balance') {
    return merchantRepository.sum(field);
  }

  public async update(id: number, data: any) {
    const [ rows ] = await merchantRepository.update(data, { where: { id } });
    return rows === 1;
  }

}

export const merchantStore = new MerchantStore();
