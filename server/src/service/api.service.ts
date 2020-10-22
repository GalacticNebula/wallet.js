import _ from 'lodash';
import { ethHelper } from '@helpers/index';
import BaseService from './base.service';
import { Exception } from '@common/exceptions';
import { Code } from '@common/enums';
import { tokenStore, chainStore, userWalletStore } from '@store/index';

class ApiService extends BaseService {

  public async createWallet(params: any) {
    const { user_id, chain } = params;

    let wallet = await userWalletStore.findByUid(user_id);
    if (!wallet) {
      const eth = await ethHelper.createWallet(user_id);
      await userWalletStore.upsert({ user_id, eth });
      wallet = await userWalletStore.findByUid(user_id);
    }

    return { address: _.pick(wallet, ['eth']) };
  }
  
  public async getWallet(params: any) {
    const { user_id } = params;
    const wallet = await userWalletStore.findByUid(user_id);
    if (!wallet) throw new Exception(Code.BAD_PARAMS, 'user_id不合法');

    return { address: _.pick(wallet, ['eth']) };
  }

  public listToken(params: any) {
    return tokenStore.list();
  }

  public addToken(params: any) {
    // TODO
  }

  public updateToken(params: any) {
    // TODO
  }

  public listChain(params: any) {
    return chainStore.list();
  }

  public updateChain(params: any) {
    // TODO
  }

  public blockNumber(params: any) {
    // TODO
  }

  public balance(params: any) {
    // TODO
  }

  public withdraw(params: any) {
    // TODO
  }

  public inside(params: any) {
    // TODO
  }

  public listOrder(params: any) {
    // TODO
  }

  public orderDetail(params: any) {
    // TODO
  }

  public listRecover(params: any) {
    // TODO
  }

  public recoverDetail(params: any) {
    // TODO
  }

  public sum(params: any) {
    // TODO
  }

  public updateOrder(params: any) {
    // TODO
  }

  public walletConfig(params: any) {
    // TODO
  }

  public updateWithdrawAddress(params: any) {
    // TODO
  }

  public updateCollectAddress(params: any) {
    // TODO
  }

  public addGasAddress(params: any) {
    // TODO
  }

  public removeGasAddress(params: any) {
    // TODO
  }

  public listCallback(params: any) {
    // TODO
  }

  public updateCallback(params: any) {
    // TODO
  }

}

export const apiService = new ApiService();
