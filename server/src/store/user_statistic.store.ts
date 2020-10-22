import _ from 'lodash';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { userStatisticRepository } from '@models/index';
import BaseStore from './base.store';
import { np } from '@common/utils';

class UserStatisticStore extends BaseStore {

  public create(uid: string, transaction?: Transaction) {
    return userStatisticRepository.create({ uid }, { transaction });
  }

  public async add(uid: number, values: any) {
    const fields = [
      'total_fee',
      'total_in_amount',
      'total_out_amount',
      'total_orders',
      'verified_in_orders',
      'verified_out_orders',
      'total_withdraw',
      'total_recharge'
    ];

    const data: any = {};
    fields.forEach(v => {
      if (_.has(values, v))
        _.assign(data, { [v]: Sequelize.literal(`${v}+${values[v]}`) })
    });

    const [ rows ] = await userStatisticRepository.update(data, {
      where: { uid }
    });

    return rows === 1;
  }
  
  public sum(field: 'total_fee' | 'total_in_amount' | 'total_out_amount' | 'total_orders' | 'verified_in_orders' | 'verified_out_orders' | 'total_withdraw' | 'total_recharge') {
    return userStatisticRepository.sum(field);
  }

}

export const userStatisticStore = new UserStatisticStore();
