import _ from 'lodash';
import moment from 'moment';
import { Op, UniqueConstraintError } from 'sequelize';
import { ethHelper, tronHelper } from '@helpers/index';
import BaseService from './base.service';
import { Assert, Exception } from '@common/exceptions';
import { AddressType, Code, OrderState, OrderType } from '@common/enums';
import { tokenStore, chainStore, userWalletStore, orderStore, addressStore, recoverStore, callbackStore } from '@store/index';
import { np } from '@common/utils';
import { findErc20Config } from '@config/erc20';
import { pushTask } from '@common/mq';
import { TokenModel } from '@models/token.model';
import { WORKER_QUEUE } from '@config/env';

class ApiService extends BaseService {

  public async createWallet(params: any) {
    const { user_id, cold, eth, tron } = params;

    const exist = await userWalletStore.findByUid(user_id);
    if (!_.isNil(exist))
      return { address: _.pick(exist, ['eth', 'tron']) };

    const data: any = { user_id, cold };
    if (cold) {
      Assert(!_.isNil(eth) || !_.isNil(tron), Code.SERVER_ERROR, 'both address null');
      if (!_.isNil(eth))
        _.assign(data, { eth });
      if (!_.isNil(tron))
        _.assign(data, { tron });
    } else {
      const _eth = await ethHelper.createWallet(user_id);
      const _tron = await tronHelper.createWallet(user_id);
      _.assign(data, { eth: _eth, tron: _tron });
    }

    const wallet = await userWalletStore.create(data);
    return { address: _.pick(wallet, ['eth', 'tron']) };
  }
  
  public async getWallet(params: any) {
    const { user_id } = params;
    const wallet = await userWalletStore.findByUid(user_id);
    if (!wallet) throw new Exception(Code.BAD_PARAMS, 'user_id不合法');

    return { address: _.pick(wallet, ['eth', 'tron']) };
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

  public async blockNumber(params: any) {
    const { chain } = params;
    let block_number = 0;
    if (chain == 'eth') {
      block_number = await ethHelper.web3.eth.getBlockNumber();
    }

    return { chain, block_number };
  }

  public async balance(params: any) {
    const { address, token_id } = params;
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.BAD_PARAMS, `token ${token_id} not found`);

    return this.getBalance(address, token);
  }

  private async getBalance(address: string, token: TokenModel) {
    let balance = 0;
    const token_id = _.get(token, 'id');
    const { chain, address: token_address, symbol } = token;
    if (chain == 'eth') {
      if (token_address == '-1') {
        balance = Number(await ethHelper.web3.eth.getBalance(address));
      } else {
        const config = findErc20Config(symbol);
        if (!config) throw new Exception(Code.BAD_PARAMS, `token ${token_id} not support now`);

        const contract = new ethHelper.web3.eth.Contract(config.abi, token.address);
        balance = await contract.methods.balanceOf(address).call();  
      }
    } else {
      throw new Exception(Code.SERVER_ERROR, `token ${token_id} not support`);
    }

    return { balance };
  }

  public async userBalance(params: any) {
    const { uids, token_id } = params;
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.BAD_PARAMS, `token ${token_id} not found`);

    const { chain } = token;
    const ids = uids.split(',');
    const ret = [];
    for (let i = 0; i < ids.length; i++) {
      const uid = ids[i];
      const u = await userWalletStore.findByUid(uid);
      if (!u) continue;

      const address = _.get(u, chain);
      if (_.isNil(address) || _.isEmpty(address))
        continue;

      const { balance } = await this.getBalance(address, token);
      ret.push({
        uid,
        balance
      });
    }

    return ret;
  }

  public async withdraw(params: any) {
    const { to, count, token_id, user_id, req_order_id, gas, force } = params;
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.BAD_PARAMS, `token ${token_id} not found`);

    const { decimals, chain } = token;
    const amount = np.times(count, Math.pow(10, decimals));

    if (!force) {
      const exist = await userWalletStore.findOne({ where: { [chain]: to } });
      if (exist != null) {
        Assert(exist.user_id != user_id, Code.BAD_PARAMS, 'you cannot withdraw to yourself');

        const ua = await userWalletStore.findByUid(user_id);
        if (!ua) throw new Exception(Code.SERVER_ERROR, `user ${user_id} wallet not found`)

        let order;
        try {
          order = await orderStore.create({
            user_id,
            token_id,
            timestamp: moment(),
            txid: `${Date.now()}${exist.user_id}`,
            out_or_in: 2,
            type: OrderType.WITHDRAW,
            count: amount,
            from: _.get(ua, chain),
            to,
            req_order_id,
            state: OrderState.CONFIRM
          });
        } catch (e) {
          if (e instanceof UniqueConstraintError)
            throw new Exception(Code.BAD_PARAMS, `req_order_id ${req_order_id} already exist`);
    
          throw e;
        }

        if (order != null)
          await pushTask(WORKER_QUEUE, { action: 'callback', data: { order_id: order.id } });

        return;
      }
    }

    const address = await addressStore.find(AddressType.WITHDRAW, chain);
    if (!address) throw new Exception(Code.SERVER_ERROR, `withdraw address ${chain} not found`);

    try {
      await orderStore.create({
        user_id,
        token_id,
        timestamp: moment(),
        out_or_in: 1,
        type: OrderType.WITHDRAW,
        count: amount,
        from: address.address,
        to,
        req_order_id,
        state: OrderState.CREATED
      });
    } catch (e) {
      if (e instanceof UniqueConstraintError)
        throw new Exception(Code.BAD_PARAMS, `req_order_id ${req_order_id} already exist`);

      throw e;
    }
  }

  public async inside(params: any) {
    const { address, chain, memo } = params;
    const exist = await userWalletStore.findOne({
      where: { [chain]: address }
    });

    return { is: (exist != null) };
  }

  public async listOrder(params: any) {
    const {
      token_id,
      user_id,
      type,
      page_size = 20,
      page_num = 0,
      state,
      out_or_in,
      flag,
      start_time,
      end_time
    } = params;

    const where: any = {};
    if (!_.isNil(token_id)) _.assign(where, { token_id });
    if (!_.isNil(user_id)) _.assign(where, { user_id });
    if (!_.isNil(type)) _.assign(where, { type });
    if (!_.isNil(out_or_in)) _.assign(where, { out_or_in });
    if (!_.isNil(flag)) _.assign(where, { flag });
    if (!_.isNil(start_time)) _.assign(where, { [Op.gt]: start_time });
    if (!_.isNil(end_time)) _.assign(where, { [Op.lt]: end_time });
    if (!_.isNil(state)) {
      const states = state.split(',');
      _.assign(where, { state: (states.length == 1 ? states[0] : states) });
    }

    const { rows, count } = await orderStore.findAndCountAll({
      where,
      offset: page_num * page_size,
      limit: page_size,
      order: [['id','ASC']]
    });

    return {
      total: count,
      page_num,
      page_size,
      list: rows.map(v => v.serializer())
    };
  }

  public async orderDetail(params: any) {
    const { order_id } = params;
    const order = await orderStore.findById(order_id);
    if (!order) throw new Exception(Code.BAD_PARAMS, `order ${order_id} not found`);
    return order.serializer();
  }

  public async listRecovery(params: any) {
    const {
      token_id,
      user_id,
      page_size = 20,
      page_num = 0,
      start_time,
      end_time
    } = params;

    const where: any = { state: 2 };
    if (!_.isNil(token_id)) _.assign(where, { token_id });
    if (!_.isNil(user_id)) _.assign(where, { user_id });
    if (!_.isNil(start_time)) _.assign(where, { [Op.gt]: start_time });
    if (!_.isNil(end_time)) _.assign(where, { [Op.lt]: end_time });

    const { rows, count } = await recoverStore.findAndCountAll({
      where,
      offset: page_num * page_size,
      limit: page_size,
      order: [['id','ASC']]
    });

    return {
      total: count,
      page_num,
      page_size,
      list: rows.map(v => v.serializer())
    };
  }

  public async recoveryDetail(params: any) {
    const { recovery_id } = params;
    const recovery = await recoverStore.findById(recovery_id);
    if (!recovery) throw new Exception(Code.BAD_PARAMS, `recovery ${recovery_id} not found`);
    return recovery.serializer();
  }

  public async sum(params: any) {
    const { token_id, type, user_id, start_time, end_time } = params;
    
    const where: any = { token_id, type };
    if (!_.isNil(user_id)) _.assign(where, { user_id });
    if (!_.isNil(start_time)) _.assign(where, { [Op.gt]: start_time });
    if (!_.isNil(end_time)) _.assign(where, { [Op.lt]: end_time });

    const sum = await orderStore.sum(where);
    return sum;
  }

  public async updateOrder(params: any) {
    const { order_ids, flag } = params;
    const ids = order_ids.split(',');

    const done = [];
    const no = [];
    const fail = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        const up = await orderStore.setFlag(Number(id), flag);
        if (up)
          done.push(id);
        else
          no.push(id);
      } catch (e) {
        fail.push(id);
      }
    }

    return {
      '1': done,
      '2': no,
      '3': fail
    };
  }

  public async walletConfig(params: any) {
    const rows = await addressStore.list();
    return rows.map(v => ({
        ...v.serializer({ exclude: ['private_key'] }),
        private_key: (_.size(v.private_key) == 0 ? v.private_key : (v.private_key.substr(0, 6) + '...' + v.private_key.substr(-6, 6)))
    }));
  }

  public async updateWithdrawAddress(params: any) {
    const { chain, address, privateKey } = params;
    if ((chain == 'eth' || chain == 'eos') && _.isNil(privateKey))
      throw new Exception(Code.BAD_PARAMS, `${chain} privateKey cant be null`);

    const [ instance, created ] = await addressStore.findOrCreate({
      defaults: {
        type: AddressType.WITHDRAW,
        chain,
        address,
        private_key: privateKey
      },
      where: { type: AddressType.WITHDRAW, chain }
    });

    if (!created) {
      await addressStore.update(instance.id, {
        address,
        private_key: privateKey
      });
    }
  }

  public async updateCollectAddress(params: any) {
    const { chain, address } = params;

    const [ instance, created ] = await addressStore.findOrCreate({
      defaults: {
        type: AddressType.COLLECT,
        chain,
        address
      },
      where: { type: AddressType.COLLECT, chain }
    });

    if (!created) {
      await addressStore.update(instance.id, {
        address
      });
    }
  }

  public async addGasAddress(params: any) {
    const { chain, address, privateKey } = params;
    if (chain == 'eth' && _.isNil(privateKey))
      throw new Exception(Code.BAD_PARAMS, `${chain} privateKey cant be null`);

    await addressStore.create({
      type: AddressType.GAS,
      chain,
      address,
      private_key: privateKey
    });
  }

  public async removeGasAddress(params: any) {
    const { chain, addresses } = params;
    await addressStore.remove({
      type: AddressType.GAS,
      chain,
      address: addresses.split(',')
    });
  }

  public listCallback(params: any) {
    return callbackStore.list();
  }

  public async updateCallback(params: any) {
    const { call_id, call_url_path } = params;
    const up = await callbackStore.update(call_id, call_url_path);
    Assert(up, Code.SERVER_ERROR, 'update callback failed');
  }

}

export const apiService = new ApiService();
