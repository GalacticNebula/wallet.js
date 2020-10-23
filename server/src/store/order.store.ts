import _ from 'lodash';
import BaseStore from './base.store';
import { orderRepository } from '@models/index';

class OrderStore extends BaseStore {

  public findOne(options: any) {
    return orderRepository.findOne(options);
  }

  public create(data: any) {
    return orderRepository.create(data);
  }

}

export const orderStore = new OrderStore();
