import _ from 'lodash';
import BaseStore from './base.store';
import { recoverRepository } from '@models/index';
import { OrderState } from '@common/enums';

class RecoverStore extends BaseStore {

  public findById(id: number) {
    return recoverRepository.findByPk(id);
  }

  public findOne(options: any) {
    return recoverRepository.findOne(options);
  }

  public create(data: any) {
    return recoverRepository.create(data);
  }

  public findAll(options: any) {
    return recoverRepository.findAll(options);
  }

  public findAndCountAll(options: any) {
    return recoverRepository.findAndCountAll(options);
  }

  public findOrCreate(options: any) {
    return recoverRepository.findOrCreate(options);
  }

  public async waitConfirm(id: number, block_number: number) {
    const [ rows ] = await recoverRepository.update({
      state: OrderState.WAIT_CONFIRM,
      block_number
    }, {
      where: { id, state: OrderState.HASH }
    });

    return rows === 1;
  }

  public async finish(id: number, status: boolean) {
    const [ rows ] = await recoverRepository.update({
      state: (status ? OrderState.CONFIRM : OrderState.TOBC_FAILED)
    }, {
      where: { id }
    });

    return rows === 1;
  }

  public async hash(id: number, txid: string) {
    const [ rows ] = await recoverRepository.update({
      state: OrderState.HASH,
      txid
    }, {
      where: { id, state: OrderState.CREATED }
    });

    return rows === 1;
  }

  public async hashFail(id: number) {
    const [ rows ] = await recoverRepository.update({
      state: OrderState.HASH_FAILED
    }, {
      where: { id, state: OrderState.CREATED }
    });

    return rows === 1;
  }

}

export const recoverStore = new RecoverStore();
