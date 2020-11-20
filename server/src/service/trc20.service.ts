import _ from 'lodash';
import cron from 'node-cron';
import moment from 'moment';
import { Op } from 'sequelize';
import BaseService from './base.service';
import { AddressType, Code, OrderState, OrderType, OutOrIn } from "@common/enums";
import { Assert, Exception } from "@common/exceptions";
import { TokenModel } from "@models/token.model";
import { addressStore, feeStore, orderStore, recoverStore, tokenStatusStore, tokenStore, userWalletStore } from "@store/index";
import { logger, min } from '@common/utils';
import { OrderModel } from '@models/order.model';
import { RecoverModel } from '@models/recover.model';
import { sequelize } from '@common/dbs';
import { FeeModel } from '@models/fee.model';
import { tryLock } from '@helpers/decorator';


export class Trc20Service extends BaseService {

  private deposit_lock = false;
  private confirm_lock = false;
  private withdraw_lock = false;
  private collect_lock = false;
  private payfee_lock = false;
  private token_id: number;
  private contract: any;

  constructor(private token: TokenModel) {
    super();
    this.token_id = _.get(token, 'id');
    this.init();
  }

  public static async create(token_id: number) {
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.SERVER_ERROR, `token ${token_id} not found`);

    return new Trc20Service(token);
  }

  public init() {
    const self = this;

    //this.contract = new web3.eth.Contract(this.config.abi, this.token.address);

    const timezone = 'Asia/Shanghai';
  }

}
