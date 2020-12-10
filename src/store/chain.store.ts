import _ from 'lodash';
import BaseStore from './base.store';
import { chainRepository } from '@models/index';

class ChainStore extends BaseStore {

  public findById(id: number) {
    return chainRepository.findByPk(id);
  }

  public list() {
    return chainRepository.findAll();
  }

}

export const chainStore = new ChainStore();
