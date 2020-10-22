import { Context } from 'koa';
import BaseController from '../base.controller';
import { apiService } from '@service/index';

class ApiController extends BaseController {

  public timestamp() {
    return Date.now();
  }

  public createWallet(ctx: Context) {
    
  }

  public getWallet(ctx: Context) {
    
  }

  public listToken(ctx: Context) {
    
  }

  public addToken(ctx: Context) {
    
  }

  public updateToken(ctx: Context) {
    
  }

  public listChain(ctx: Context) {
    
  }

  public updateChain(ctx: Context) {
    
  }

  public blockNumber(ctx: Context) {
    
  }

  public balance(ctx: Context) {
    
  }

  public withdraw(ctx: Context) {
    
  }

  public inside(ctx: Context) {
    
  }

  public listOrder(ctx: Context) {
    
  }

  public orderDetail(ctx: Context) {
    
  }

  public listRecover(ctx: Context) {
    
  }

  public recoverDetail(ctx: Context) {
    
  }

  public sum(ctx: Context) {
    
  }

  public updateOrder(ctx: Context) {
    
  }

  public walletConfig(ctx: Context) {
    
  }

  public updateWithdrawAddress(ctx: Context) {
    
  }

  public updateCollectAddress(ctx: Context) {
    
  }

  public addGasAddress(ctx: Context) {
    
  }

  public removeGasAddress(ctx: Context) {
    
  }

  public listCallback(ctx: Context) {
    
  }

  public updateCallback(ctx: Context) {
    
  }

}

export const apiController = new ApiController();
