import * as _ from 'lodash';
import { Transaction } from 'sequelize';
import BaseStore from './base.store';
import { userAuthRepository } from '@models/index';

export enum UserAuthType {
  PHONE = 0,
  USERNAME = 1
}

class UserAuthStore extends BaseStore {

  public create(data: any, transaction?: Transaction) {
    return userAuthRepository.create(data, { transaction });
  }

  public async login(account: string, type: UserAuthType = UserAuthType.PHONE) {
    const ua = await userAuthRepository.findOne({
      where: { account, type }
    });
    
    return ua;
  }

  public findOne(account: string, type: UserAuthType) {
    return userAuthRepository.findOne({
      where: {
        account,
        type
      }
    });
  }

  public findByUid(uid: string | number) {
    return userAuthRepository.findOne({
      where: { uid }
    });
  }

  public async changePasswd(uid: number, password: string) {
    const [ rows ] = await userAuthRepository.update({
      password
    }, {
      where: { uid }
    });

    return rows === 1;
  }

  public async resetPasswd(account: string, type: UserAuthType, password: string) {
    const [ rows ] = await userAuthRepository.update({
      password
    }, { where: { account, type } });

    return rows === 1;
  }

}

export const userAuthStore = new UserAuthStore();