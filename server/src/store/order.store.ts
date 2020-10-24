import _ from 'lodash';
import BaseStore from './base.store';
import { orderRepository } from '@models/index';
import { OrderCollectState, OrderState } from '@common/enums';

class OrderStore extends BaseStore {

  public findOne(options: any) {
    return orderRepository.findOne(options);
  }

  public create(data: any) {
    return orderRepository.create(data);
  }

  public findAll(options: any) {
    return orderRepository.findAll(options);
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

  public async collectHash(id: number, collect_hash: string, collect_gas_limit: number, collect_gas_price: string) {
    const [ rows ] = await orderRepository.update({
      collect_hash,
      collect_gas_limit,
      collect_gas_price,
      collect_state: OrderCollectState.HASH
    }, {
      where: { id }
    });

    return rows === 1;
  }

  public async recovery(id: number) {
    const [ rows ] = await orderRepository.update({
      collect_state: OrderCollectState.DONE
    }, {
      where: { id }
    });

    return rows === 1;
  }

}

export const orderStore = new OrderStore();
