import _ from 'lodash';
import BaseStore from './base.store';
import { callbackRepository } from '@models/index';

class CallbackStore extends BaseStore {

  public findById(id: number) {
    return callbackRepository.findByPk(id);
  }

  public list() {
    return callbackRepository.findAll();
  }

  public async update(id: number, call_url_path: string) {
    const [ rows ] = await callbackRepository.update({
      call_url_path
    }, {
      where: { id }
    });

    return rows === 1;
  }

}

export const callbackStore = new CallbackStore();