import * as _ from 'lodash';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { userQueueRepository } from '@models/index';
import BaseStore from './base.store';
import { OrderPayType } from './order.store';

class UserQueueStore extends BaseStore {

  public findByUid(uid: number) {
    return userQueueRepository.findOne({ where: { uid } });
  }

  public count() {
    return userQueueRepository.count();
  }

  public async match(pay_type: OrderPayType, amount: number, limit: number = 20) {
    const where: any = { balance: {[Op.gte]: amount } };
    if (pay_type == OrderPayType.BANK || pay_type == OrderPayType.ALIPAY_TO_BANK)
      _.assign(where, { bank_enabled: true });
    else if (pay_type == OrderPayType.ALIPAY)
      _.assign(where, { alipay_enabled: true });

    const list = await userQueueRepository.findAll({
      where,
      limit,
      order:[['id','ASC']]
    });

    return list;
  }

  public async add(data: any, start_at?: Date) {
    const d = { ...data, start_at: (!_.isNil(start_at) ? start_at : new Date()) };
    await userQueueRepository.upsert(d);
  }

  public async remove(uid: number) {
    await userQueueRepository.destroy({ where: { uid } });
  }

  public async timeout(seconds: number) {
    const time = moment().subtract(seconds, 'seconds');
    await userQueueRepository.destroy({
      where: {
        start_at: { [Op.lt]: time }
      }
    });
  }

  public async update(uid: number, balance: number) {
    const [ rows ] = await userQueueRepository.update({
      balance
    }, {
      where: { uid }
    });

    return rows === 1;
  }

}

export const userQueueStore = new UserQueueStore();
