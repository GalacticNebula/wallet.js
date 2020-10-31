import _ from 'lodash';
import { Transaction } from 'sequelize';
import { sequelize } from '@common/dbs';
import BaseStore from './base.store';
import { orderRepository } from '@models/index';
import { OrderCollectState, OrderState } from '@common/enums';

class OrderStore extends BaseStore {

  public findById(id: number) {
    return orderRepository.findByPk(id);
  }

  public findOne(options: any) {
    return orderRepository.findOne(options);
  }

  public create(data: any) {
    return orderRepository.create(data);
  }

  public findAll(options: any) {
    return orderRepository.findAll(options);
  }

  public findAndCountAll(options: any) {
    return orderRepository.findAndCountAll(options);
  }

  public sum(where: any) {
    return orderRepository.sum('count', { where });
  }

  public async setFlag(id: number, flag: number) {
    const [ rows ] = await orderRepository.update({
      flag
    }, {
      where: { id }
    });

    return rows === 1;
  }

  public async waitConfirm(id: number, block_number: number) {
    const [ rows ] = await orderRepository.update({
      state: OrderState.WAIT_CONFIRM,
      block_number
    }, {
      where: { id, state: OrderState.HASH }
    });

    return rows === 1;
  }

  public async finish(id: number, status: boolean) {
    const [ rows ] = await orderRepository.update({
      state: (status ? OrderState.CONFIRM : OrderState.TOBC_FAILED)
    }, {
      where: { id }
    });

    return rows === 1;
  }

  public async hash(id: number, txid: string) {
    const [ rows ] = await orderRepository.update({
      state: OrderState.HASH,
      txid
    }, {
      where: { id, state: OrderState.CREATED }
    });

    return rows === 1;
  }

  public async hashFail(id: number) {
    const [ rows ] = await orderRepository.update({
      state: OrderState.HASH_FAILED
    }, {
      where: { id, state: OrderState.CREATED }
    });

    return rows === 1;
  }

  public async fee(id: number, transaction?: Transaction) {
    const [ rows ] = await orderRepository.update({
      collect_state: OrderCollectState.FEE
    }, {
      where: { id, collect_state: OrderCollectState.NONE },
      transaction
    });

    return rows === 1;
  }

  public async collected(id: number, transaction?: Transaction) {
    const [ rows ] = await orderRepository.update({
      collect_state: OrderCollectState.DONE
    }, {
      where: { id, collect_state: [ OrderCollectState.NONE, OrderCollectState.FEE ] },
      transaction
    });

    return rows === 1;
  }

}

export const orderStore = new OrderStore();
