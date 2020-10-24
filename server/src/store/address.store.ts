import _ from 'lodash';
import BaseStore from './base.store';
import { addressRepository } from '@models/index';

class AddressStore extends BaseStore {

  public findById(id: number) {
    return addressRepository.findByPk(id);
  }

  public list() {
    return addressRepository.findAll();
  }

  public find(type: number, chain: string) {
    return addressRepository.findOne({
      where: { type, chain }
    });
  }

}

export const addressStore = new AddressStore();