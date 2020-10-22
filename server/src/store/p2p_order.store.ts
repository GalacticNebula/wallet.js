import * as _ from 'lodash';
import { Op, Transaction } from 'sequelize';
import BaseStore from './base.store';
import { p2pOrderRepository } from '@models/index';

export enum P2pOrderState {
  CREATED = 0,
  REVOKED = 1,
  VERIFIED = 2,
  TIMEOUT = 3,
  FAILED = 4,
  MANUAL = 8
}

class P2pOrderStore extends BaseStore {

  public findById(id: number) {
    return p2pOrderRepository.findByPk(id);
  }

  public findAll(options: any) {
    return p2pOrderRepository.findAll(options);
  }

  public findAndCountAll(options: any) {
    return p2pOrderRepository.findAndCountAll(options);
  }

  public countActive(uid: number) {
    return p2pOrderRepository.count({ where: { uid, state: P2pOrderState.CREATED } });
  }

  public list(options: any) {
    const { uid, active, page = 0, pageSize = 10 } = options;
    const where: any = {};
    if (!_.isNil(uid)) _.assign(where, { uid });
    if (!_.isNil(active)) _.assign(where, { state: (active ? P2pOrderState.CREATED : { [Op.not]: P2pOrderState.CREATED }) });

    return p2pOrderRepository.findAll({
      where,
      offset: page * pageSize,
      limit: pageSize,
      order: [['id','DESC']]
    });
  }

  public create(data: any, transaction?: Transaction) {
    return p2pOrderRepository.create(data, { transaction });
  }

  public async pay(id: number, receipt: string) {
    const [ rows ] = await p2pOrderRepository.update({
      paid: true,
      receipt
    }, {
      where: { id, paid: false }
    });

    return rows === 1;
  }

  public async confirm(id: number, admin_uname: string, real_amount: number, transaction?: Transaction) {
    const [ rows ] = await p2pOrderRepository.update({
      state: P2pOrderState.VERIFIED,
      verified_at: new Date(),
      verified_by: admin_uname,
      amount: real_amount
    }, {
      where: { id, state: P2pOrderState.CREATED },
      transaction
    });

    return rows === 1;
  }

  public async manual(id: number, transaction?: Transaction) {
    const [ rows ] = await p2pOrderRepository.update({
      state: P2pOrderState.MANUAL,
      verified_at: new Date(),
    }, {
      where: { id, state: P2pOrderState.CREATED },
      transaction
    });

    return rows === 1;
  }

  public async revoke(id: number, transaction?: Transaction) {
    const [ rows ] = await p2pOrderRepository.update({
      state: P2pOrderState.REVOKED
    }, {
      where: { id, state: P2pOrderState.CREATED },
      transaction
    });

    return rows === 1;
  }

  public total() {
    return p2pOrderRepository.sum('amount', {
      where: { state: [ P2pOrderState.VERIFIED, P2pOrderState.MANUAL ] }
    });
  }

}

export const p2pOrderStore = new P2pOrderStore();
