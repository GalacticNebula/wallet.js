import _ from 'lodash';
import BaseStore from './base.store';
import { tokenRepository } from '@models/index';

class TokenStore extends BaseStore {

  public findById(id: number) {
    return tokenRepository.findByPk(id);
  }

  public list() {
    return tokenRepository.findAll();
  }

}

export const tokenStore = new TokenStore();
