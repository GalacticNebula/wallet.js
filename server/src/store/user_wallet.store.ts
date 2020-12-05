import * as _ from 'lodash';
import BaseStore from './base.store';
import { userWalletRepository } from '@models/index';

class UserWalletStore extends BaseStore {

  public findByUid(user_id: number) {
    return userWalletRepository.findOne({ where: { user_id } });
  }

  public findOne(options: any) {
    return userWalletRepository.findOne(options);
  }

  public create(data: any) {
    return userWalletRepository.create(data);
  }

  public upsert(data: any) {
    return userWalletRepository.upsert(data);
  }

}

export const userWalletStore = new UserWalletStore();
