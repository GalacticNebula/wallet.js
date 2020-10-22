import * as _ from 'lodash';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import BaseStore from './base.store';
import { orderRepository } from '@models/index';
import { CardModel } from '@models/card.model';

export enum OrderPayType {
  BANK = 0,
  ALIPAY = 1,
  ALIPAY_TO_BANK = 2,
  WECHAT = 3
}

export enum OrderState {
  CREATED = 0,
  MATCH = 1,
  VERIFIED = 2,
  CANCEL = 3,
  TIMEOUT = 4,
  FAIL = 5
}

class OrderStore extends BaseStore {

  public create(data: any, transaction?: Transaction) {
    return orderRepository.create(data, { transaction });
  }

  public findById(id: number) {
    return orderRepository.findByPk(id);
  }

  public find(merchant_id: number, orderid: string) {
    return orderRepository.findOne({
      where: {
        merchant_id,
        orderid
      }
    });
  }

  public findAll(options: any) {
    return orderRepository.findAll(options);
  }

  public findAndCountAll(options: any) {
    return orderRepository.findAndCountAll(options);
  }

  public list(uid: number, options?: any) {
    const { active, page = 0, pageSize = 10 } = options || {};
    const where: any = { uid };
    if (!_.isNil(active)) {
      const state = active ? OrderState.MATCH : OrderState.VERIFIED;
      _.assign(where, { state });
    }

    return orderRepository.findAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

  public async pay(merchant_id: number, orderid: string, transaction?: Transaction) {
    const [ rows ] = await orderRepository.update({
      paid: true
    }, {
      where: {
        merchant_id,
        orderid,
        paid: false
      },
      transaction
    });

    return rows === 1;
  }

  public async revoke(id: number, from_state: OrderState, transaction?: Transaction) {
    const [ rows ] = await orderRepository.update({
      state: OrderState.CANCEL
    }, {
      where: {
        id,
        state: from_state
      },
      transaction
    });

    return rows === 1;
  }

  public async confirm(id: number, uid: number, real_amount: number, transaction?: Transaction) {
    const [ rows ] = await orderRepository.update({
      state: OrderState.VERIFIED,
      verified_at: new Date(),
      real_amount
    }, {
      where: {
        id,
        uid,
        state: OrderState.MATCH
      },
      transaction
    });

    return rows === 1;
  }

  public async match(id: number, card: CardModel, transaction?: Transaction) {
    const { uid, bank, branch, name, cardno, qrcode } = card;
    const [ rows ] = await orderRepository.update({
      uid,
      card_id: _.get(card, 'id'),
      bank,
      branch,
      name,
      cardno,
      qrcode,
      state: OrderState.MATCH,
      match_at: new Date()
    }, {
      where: {
        id,
        state: OrderState.CREATED
      },
      transaction
    });

    return rows === 1;
  }

  public async notify(id: number) {
    const [ rows ] = await orderRepository.update({
      notified: true
    }, {
      where: { id }
    });

    return rows === 1;
  }

  public async newOrderIds() {
    const rows = await orderRepository.findAll({
      attributes: ['id'],
      where: {
        state: OrderState.CREATED
      }
    });

    return rows.map(v => v.id);
  }

  public async timeoutCreated(seconds: number) {
    const time = moment().subtract(seconds, 'seconds').toDate();
    await orderRepository.update({
      state: OrderState.TIMEOUT
    }, {
      where: {
        state: OrderState.CREATED,
        createdAt: { [Op.lt]: time }
      }
    });
  }

  public async timeoutMatchIds(seconds: number) {
    const time = moment().subtract(seconds, 'seconds').toDate();
    const rows = await orderRepository.findAll({
      attributes: ['id'],
      where: {
        state: OrderState.MATCH,
        match_at: { [Op.lt]: time }
      }
    });

    return rows.map(v => v.id);
  }

  public async timeoutMatch(id: number, transaction?: Transaction) {
    const [ rows ] = await orderRepository.update({
      state: OrderState.TIMEOUT
    }, {
      where: {
        id,
        state: OrderState.MATCH
      },
      transaction
    });

    return rows === 1;
  }

  public async renew(id: number, transaction?: Transaction) {
    const [ rows ] = await orderRepository.update({
      state: OrderState.MATCH,
      match_at: new Date()
    }, {
      where: {
        id,
        state: OrderState.TIMEOUT
      },
      transaction
    });

    return rows === 1;
  }

  public sum(where: any) {
    return orderRepository.sum('real_amount', { where });
  }

}

export const orderStore = new OrderStore();
