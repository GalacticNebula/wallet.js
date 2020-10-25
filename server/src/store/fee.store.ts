import _ from 'lodash';
import { Transaction } from 'sequelize';
import BaseStore from './base.store';
import { feeRepository } from '@models/index';
import { OrderState } from '@common/enums';

class FeeStore extends BaseStore {

  public findOne(options: any) {
    return feeRepository.findOne(options);
  }

  public create(data: any, transaction: Transaction) {
    return feeRepository.create(data, { transaction });
  }

  public findAll(options: any) {
    return feeRepository.findAll(options);
  }

  public findOrCreate(options: any) {
    return feeRepository.findOrCreate(options);
  }

  public async waitConfirm(id: number, block_number: number) {
    const [ rows ] = await feeRepository.update({
      state: OrderState.WAIT_CONFIRM,
      block_number
    }, {
      where: { id, state: OrderState.HASH }
    });

    return rows === 1;
  }

  public async finish(id: number, status: boolean) {
    const [ rows ] = await feeRepository.update({
      state: (status ? OrderState.CONFIRM : OrderState.TOBC_FAILED)
    }, {
      where: { id }
    });

    return rows === 1;
  }

  public async hash(id: number, txid: string, value: number) {
    const [ rows ] = await feeRepository.update({
      state: OrderState.HASH,
      txid,
      value
    }, {
      where: { id, state: OrderState.CREATED }
    });

    return rows === 1;
  }

  public async hashFail(id: number) {
    const [ rows ] = await feeRepository.update({
      state: OrderState.HASH_FAILED
    }, {
      where: { id, state: OrderState.CREATED }
    });

    return rows === 1;
  }

}

export const feeStore = new FeeStore();
