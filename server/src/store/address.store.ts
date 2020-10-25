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

  public create(options: any) {
    return addressRepository.create(options);
  }

  public find(type: number, chain: string) {
    return addressRepository.findOne({
      where: { type, chain }
    });
  }

  public findOrCreate(options: any) {
    return addressRepository.findOrCreate(options);
  }

  public update(id: number, data: any) {
    return addressRepository.update(data, { where: { id } });
  }

  public remove(where: any) {
    return addressRepository.destroy({ where });
  }

}

export const addressStore = new AddressStore();