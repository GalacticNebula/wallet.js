import _ from 'lodash';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { userWalletRepository } from '@models/index';
import BaseStore from './base.store';
import { np } from '@common/utils';

class UserWalletStore extends BaseStore {

  public create(uid: string, transaction?: Transaction) {
    return userWalletRepository.create({ uid }, { transaction });
  }

  public findByUid(uid: string | number) {
    return userWalletRepository.findOne({ where: { uid } });
  }

  public async balance(uid: string | number) {
    const w = await userWalletRepository.findOne({ where: { uid } });
    if (!w) return 0;

    return np.minus(w.balance, w.freeze);
  }

  public async pay(uid: string | number, amount: number, freeze: number, force: boolean = false, transaction?: Transaction) {
    const data: any = { balance: Sequelize.literal(`balance-${amount}`) };
    const where: any = { uid };
    if (!force)
      _.assign(where, { balance: { [Op.gte]: Sequelize.literal(`freeze+${np.minus(amount, freeze)}`) } });

    if (freeze > 0) {
      _.assign(data, { freeze: Sequelize.literal(`freeze-${freeze}`) });
      _.assign(where, { freeze: { [Op.gte]: freeze } });
    }

    const [ rows ] = await userWalletRepository.update(data, {
      where,
      transaction
    });

    return rows === 1;
  }

  public async accept(uid: string | number, amount: number, transaction?: Transaction) {
    const [ rows ] = await userWalletRepository.update({
      balance: Sequelize.literal(`balance+${amount}`)
    }, {
      where: { uid },
      transaction
    });

    return rows === 1;
  }

  public async lock(uid: string | number, amount: number, transaction?: Transaction) {
    const [ rows ] = await userWalletRepository.update({
      freeze: Sequelize.literal(`freeze+${amount}`)
    }, {
      where: { uid, balance: { [Op.gte]: Sequelize.literal(`freeze+${amount}`) } },
      transaction
    });

    return rows === 1;
  }

  public async unlock(uid: string | number, amount: number, transaction?: Transaction) {
    const [ rows ] = await userWalletRepository.update({
      freeze: Sequelize.literal(`freeze-${amount}`)
    }, {
      where: { uid, freeze: { [Op.gte]: amount } },
      transaction
    });

    return rows === 1;
  }

  public sum(field: 'balance') {
    return userWalletRepository.sum(field);
  }

  public async update(uid: number, data: any) {
    const [ rows ] = await userWalletRepository.update(data, { where: { uid } });
    return rows === 1;
  }

}

export const userWalletStore = new UserWalletStore();
