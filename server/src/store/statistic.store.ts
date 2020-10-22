import _ from 'lodash';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { statisticRepository } from '@models/index';
import BaseStore from './base.store';
import { np } from '@common/utils';

class StatisticStore extends BaseStore {

  public async add(values: any) {
    const fields = [
      'total_fee',
      'total_withdraw_fee'
    ];

    const data: any = {};
    fields.forEach(v => {
      if (_.has(values, v))
        _.assign(data, { [v]: Sequelize.literal(`${v}+${values[v]}`) })
    });

    const [ rows ] = await statisticRepository.update(data, {
      where: { id: { [Op.gt]: 0 } }
    });

    return rows === 1;
  }
  
}

export const statisticStore = new StatisticStore();