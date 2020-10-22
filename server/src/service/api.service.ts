import _ from 'lodash';
import { userWalletStore } from '@store/user_wallet.store';
import { ethHelper } from '@helpers/index';
import BaseService from './base.service';
import { Exception } from '@common/exceptions';
import { Code } from '@common/enums';

class ApiService extends BaseService {

  public async createWallet(params: any) {
    const { user_id, chain } = params;

    let wallet = await userWalletStore.findByUid(user_id);
    if (!wallet) {
      const eth = ethHelper.createWallet(user_id);
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
    
  }

  public addToken(params: any) {

  }

  public updateToken(params: any) {

  }

  public listChain(params: any) {

  }

  public updateChain(params: any) {

  }

  public blockNumber(params: any) {

  }

  public balance(params: any) {

  }

  public withdraw(params: any) {

  }

  public inside(params: any) {

  }

  public listOrder(params: any) {

  }

  public orderDetail(params: any) {
 
  }

  public listRecover(params: any) {

  }

  public recoverDetail(params: any) {

  }

  public sum(params: any) {

  }

  public updateOrder(params: any) {

  }

  public walletConfig(params: any) {

  }

  public updateWithdrawAddress(params: any) {

  }

  public updateCollectAddress(params: any) {

  }

  public addGasAddress(params: any) {

  }

  public removeGasAddress(params: any) {

  }

  public listCallback(params: any) {

  }

  public updateCallback(params: any) {

  }

}

export const apiService = new ApiService();
