import _ from 'lodash';
import cron from 'node-cron';
import moment from 'moment';
import { Op } from 'sequelize';
import BaseService from './base.service';
import { AddressType, Code, OrderState, OrderType, OutOrIn } from "@common/enums";
import { Assert, Exception } from "@common/exceptions";
import { TokenModel } from "@models/token.model";
import {
  addressStore,
  feeStore,
  orderStore,
  recoverStore,
  tokenStatusStore,
  tokenStore,
  userWalletStore
} from "@store/index";
import { logger, min } from '@common/utils';
import { OrderModel } from '@models/order.model';
import { RecoverModel } from '@models/recover.model';
import { sequelize } from '@common/dbs';
import { FeeModel } from '@models/fee.model';
import { tryLock } from '@helpers/decorator';
import { tronHelper } from '@helpers/index';
import { findTrc20Config, TRC20_CONFIG } from '@config/trc20';

const client = tronHelper.client;

export class Trc20Service extends BaseService {

  private deposit_lock = false;
  private confirm_lock = false;
  private withdraw_lock = false;
  private collect_lock = false;
  private payfee_lock = false;
  private token_id: number;
  private contract: any;

  constructor(private token: TokenModel, private config: TRC20_CONFIG) {
    super();
    this.token_id = _.get(token, 'id');
    this.init();
  }

  public static async create(token_id: number) {
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.SERVER_ERROR, `token ${token_id} not found`);

    const config = findTrc20Config(token.symbol);
    if (!config) throw new Exception(Code.SERVER_ERROR, `trc20 config ${token.symbol} not found`);

    return new Trc20Service(token, config);
  }

  public init() {
    const self = this;

    this.contract = new client.contract(this.token.address);

    const timezone = 'Asia/Shanghai';
  }

  @tryLock('deposit_lock')
  public async deposit() {
    const { token_id, config, contract } = this;
    const status = await tokenStatusStore.findByTokenId(token_id);
    if (!status)
      return;

    const { step, abi_from, abi_to, abi_value } = config;
    
    const blockIndex = status.block_id + 1;
    let id = await web3.eth.getBlockNumber();
    id--;

    if (id < blockIndex)
      return;

    id = min([id, blockIndex + step - 1]);
    const events = await contract.getPastEvents('Transfer', {
      fromBlock: blockIndex,
      toBlock: id
    });

    for (let i = 0; i < events.length; i++) {
      const { transactionHash: txid, returnValues, blockNumber } = events[i];
      const from = _.get(returnValues, abi_from);
      const to = _.get(returnValues, abi_to);
      const count = _.get(returnValues, abi_value);
      if (!to)
        continue;

      const wallet = await userWalletStore.findOne({ where: { eth: to } });
      if (!wallet)
        continue;

      const exist = await orderStore.findOne({ where: { txid, token_id } });
      if (exist != null)
        continue;

      const order = await orderStore.create({
        user_id: wallet.user_id,
        token_id,
        txid,
        timestamp: moment(),
        out_or_in: OutOrIn.OUT,
        type: OrderType.RECHARGE,
        count,
        from_address: from,
        to_address: to,
        block_number: blockNumber,
        state: OrderState.HASH
      });

      await this.notify(order.id);
    }

    await tokenStatusStore.setBlockId(token_id, id);
  }

}
