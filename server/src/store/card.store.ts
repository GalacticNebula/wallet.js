import * as _ from 'lodash';
import { Op, Transaction } from 'sequelize';
import BaseStore from './base.store';
import { cardRepository } from '@models/index';
import { CardState, CardType } from '@common/enums';

class CardStore extends BaseStore {

  public findById(id: number) {
    return cardRepository.findByPk(id);
  }

  public findByUid(uid: number, type?: CardType) {
    const where: any = { uid, enabled: true };
    if (!_.isNil(type))
      _.assign(where, { type });

    return cardRepository.findAll({ where });
  }

  public findAll(options?: any) {
    return cardRepository.findAll(options);
  }

  public create(data: any, transaction?: Transaction) {
    return cardRepository.create(data, { transaction });
  }

  public findAndCountAll(options: any) {
    return cardRepository.findAndCountAll(options);
  }

  public async remove(uid: number, id: number) {
    const rows = await cardRepository.destroy({
      where: {
        id,
        uid
      }
    });

    return rows === 1;
  }

  public async toggleEnabled(uid: number, id: number, enabled: boolean) {
    const [ rows ] = await cardRepository.update({
      enabled
    }, {
      where: { uid, id, state: CardState.OK }
    });

    return rows === 1;
  }

  public async choose(uid: number, id: number) {
    await cardRepository.update({
      enabled: true
    }, {
      where: { uid, id, type: CardType.BANK, state: CardState.OK }
    });

    await cardRepository.update({
      enabled: false
    }, {
      where: { uid, id: { [Op.not]: id }, type: CardType.BANK, state: CardState.OK }
    });
  }

  public findActive(uid: number, type: CardType) {
    return cardRepository.findOne({
      where: {
        uid,
        type,
        enabled: true,
        state: CardState.OK
      }
    });
  }

  public async canWork(uid: number) {
    const cnt = await cardRepository.count({
      where: { uid, enabled: true, state: CardState.OK }
    });

    return cnt > 0;
  }

  public async update(id: number, data: any) {
    const [ rows ] = await cardRepository.update(data, { where: { id } });
    return rows === 1;
  }

}

export const cardStore = new CardStore();
