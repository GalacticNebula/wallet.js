import _ from 'lodash';
import moment from 'moment';
import { ethHelper } from '@helpers/index';
import BaseService from './base.service';
import { Exception } from '@common/exceptions';
import { AddressType, Code, OrderState, OrderType } from '@common/enums';
import { tokenStore, chainStore, userWalletStore, orderStore, addressStore } from '@store/index';
import { np } from '@common/utils';

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

  public async withdraw(params: any) {
    const { to, count, token_id, user_id, req_order_id, gas, force } = params;
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.BAD_PARAMS, `token ${token_id} not found`);

    const { decimals, chain } = token;
    const amount = np.times(count, Math.pow(10, decimals));

    const address = await addressStore.find(AddressType.WITHDRAW, chain);
    if (!address) throw new Exception(Code.SERVER_ERROR, `withdraw address ${chain} not found`);

    await orderStore.create({
      user_id,
      token_id,
      timestamp: moment(),
      out_or_in: 1,
      type: OrderType.WITHDRAW,
      count: amount,
      from_address: address.address,
      to_address: to,
      req_order_id,
      state: OrderState.CREATED
    });
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
