import _ from 'lodash';
import BaseStore from './base.store';
import { tokenStatusRepository } from '@models/index';

class TokenStatusStore extends BaseStore {

  public findByTokenId(token_id: number) {
    return tokenStatusRepository.findOne({ where: { token_id } });
  }

  public async setBlockId(token_id: number, block_id: number) {
    const [ rows ] = await tokenStatusRepository.update({
      block_id
    }, {
      where: { token_id }
    });

    return rows === 1;
  }

}

export const tokenStatusStore = new TokenStatusStore();
