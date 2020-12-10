import { Context } from 'koa';
import BaseController from '../base.controller';
import { apiService } from '@service/index';

class ApiController extends BaseController {

  public timestamp(ctx: Context) {
    ctx.body = Date.now();
  }

  public createWallet(ctx: Context) {
    return apiService.createWallet(ctx.params);
  }

  public getWallet(ctx: Context) {
    return apiService.getWallet(ctx.params);
  }

  public listToken(ctx: Context) {
    return apiService.listToken(ctx.params);
  }

  public addToken(ctx: Context) {
    return apiService.addToken(ctx.params);
  }

  public updateToken(ctx: Context) {
    return apiService.updateToken(ctx.params);
  }

  public listChain(ctx: Context) {
    return apiService.listChain(ctx.params);
  }

  public updateChain(ctx: Context) {
    return apiService.updateChain(ctx.params);
  }

  public blockNumber(ctx: Context) {
    return apiService.blockNumber(ctx.params);
  }

  public balance(ctx: Context) {
    return apiService.balance(ctx.params);
  }

  public userBalance(ctx: Context) {
    return apiService.userBalance(ctx.params);
  }

  public withdraw(ctx: Context) {
    return apiService.withdraw(ctx.params);
  }

  public inside(ctx: Context) {
    return apiService.inside(ctx.params);
  }

  public listOrder(ctx: Context) {
    return apiService.listOrder(ctx.params);
  }

  public orderDetail(ctx: Context) {
    return apiService.orderDetail(ctx.params);
  }

  public listRecovery(ctx: Context) {
    return apiService.listRecovery(ctx.params);
  }

  public recoveryDetail(ctx: Context) {
    return apiService.recoveryDetail(ctx.params);
  }

  public sum(ctx: Context) {
    return apiService.sum(ctx.params);
  }

  public updateOrder(ctx: Context) {
    return apiService.updateOrder(ctx.params);
  }

  public walletConfig(ctx: Context) {
    return apiService.walletConfig(ctx.params);
  }

  public updateWithdrawAddress(ctx: Context) {
    return apiService.updateWithdrawAddress(ctx.params);
  }

  public updateCollectAddress(ctx: Context) {
    return apiService.updateCollectAddress(ctx.params);
  }

  public addGasAddress(ctx: Context) {
    return apiService.addGasAddress(ctx.params);
  }

  public removeGasAddress(ctx: Context) {
    return apiService.removeGasAddress(ctx.params);
  }

  public listCallback(ctx: Context) {
    return apiService.listCallback(ctx.params);
  }

  public updateCallback(ctx: Context) {
    return apiService.updateCallback(ctx.params);
  }

}

export const apiController = new ApiController();
