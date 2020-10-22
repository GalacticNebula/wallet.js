import * as _ from 'lodash';
import { Transaction } from 'sequelize';
import BaseStore from './base.store';
import { userRepository } from '@models/index';

export enum UserRole {
  NORMAL = 0,
  MERCHANT = 1,
  AGENT = 2,
  SYSTEM = 3
}

class UserStore extends BaseStore {

  public findById(uid: string | number) {
    return userRepository.findByPk(Number(uid));
  }

  public findByInviteCode(invitecode: string) {
    return userRepository.findOne({
      where: { invitecode }
    });
  }

  public count() {
    return userRepository.count();
  }

  public info(id: number) {
    return userRepository.findOne({
      where: { id },
      include: ['wallet','statistic']
    });
  }

  public findAll(options?: any) {
    return userRepository.findAll(options);
  }

  public create(data: any, transaction?: Transaction) {
    return userRepository.create(data, { transaction });
  }

  public findAndCountAll(options: any){
    return userRepository.findAndCountAll(options)
  }

  public async toggleOnline(uid: number, online: boolean) {
    const [ rows ] = await userRepository.update({
      online
    }, {
      where: { id: uid }
    });

    return rows === 1;
  }

  public async toggleWorking(uid: number, working: boolean) {
    const [ rows ] = await userRepository.update({
      working
    }, {
      where: { id: uid }
    });

    return rows === 1;
  }

  public async update(id: number, params: any) {
    const { enabled, level } = params;
    const data: any = {};
    if (!_.isNil(enabled)) _.assign(data, { enabled });
    if (!_.isNil(level)) _.assign(data, { level });

    const [ rows ] = await userRepository.update(data, { where: { id } });
    return rows === 1;
  }

  public listChildren(pid: number, params: any) {
    const { page = 0, pageSize = 10 } = params;
    
    return userRepository.findAndCountAll({
      where: { pid },
      offset: page * pageSize,
      limit: pageSize,
      distinct: true,
      include: ['statistic'],
      order: [['id','DESC']]
    });
  }

}

export const userStore = new UserStore();
