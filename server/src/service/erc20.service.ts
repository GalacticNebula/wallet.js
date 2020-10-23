import _ from 'lodash';
import Web3 from 'web3';
import cron from 'node-cron';
import moment from 'moment';
import BaseService from './base.service';
import { Code, OrderState, OrderType, OutOrIn } from "@common/enums";
import { Exception } from "@common/exceptions";
import { TokenModel } from "@models/token.model";
import { orderStore, tokenStatusStore, tokenStore, userWalletStore } from "@store/index";
import { ERC20_CONFIG, findErc20Config } from '@config/erc20';
import { logger, min } from '@common/utils';

const web3 = new Web3(Web3.givenProvider || 'https://kovan.infura.io/v3/bd8e235958e54c08a0cc78d34d26612a');

const timezone = 'Asia/Shanghai';

function tryLock(name: string) {
  return function(target: any, propertyName: string, descriptor: TypedPropertyDescriptor<(...args: any[]) => any>) {
    const method = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      if (!_.has(target, name)) throw new Exception(Code.SERVER_ERROR, `target without ${name}`);
      if (target[name] == true)
        return;

      target[name] = true;

      const result = await method!.apply(this, args);
      target[name] = false;
      return result;
    };
  };
}

export class Erc20Service extends BaseService {

  private deposit_lock = false;
  private confirm_lock = false;
  private token_id: number;

  constructor(private token: TokenModel, private config: ERC20_CONFIG) {
    super();
    this.token_id = _.get(token, 'id');
    this.init();
  }

  public static async create(token_id: number) {
    const token = await tokenStore.findById(token_id);
    if (!token) throw new Exception(Code.SERVER_ERROR, `token ${token_id} not found`);

    const config = findErc20Config(token.symbol);
    if (!config) throw new Exception(Code.SERVER_ERROR, `erc20 config ${token.symbol} not found`);

    return new Erc20Service(token, config);
  }

  public init() {
    const self = this;
    cron.schedule('*/20 * * * * *', async () => await self.deposit(), { timezone }).start();
    cron.schedule('*/30 * * * * *', async () => await self.confirm(), { timezone }).start();
  }

  @tryLock('deposit_lock')
  public async deposit() {
    const { token_id, token, config } = this;
    const status = await tokenStatusStore.findByTokenId(token_id);
    if (!status)
      return;

    const { step, abi, abi_from, abi_to, abi_value } = config;
    const contract = new web3.eth.Contract(abi, token.address);
    
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

      await orderStore.create({
        user_id: wallet.user_id,
        token_id,
        txid,
        timestamp: moment(),
        out_or_in: OutOrIn.OUT,
        type: OrderType.RECHARGE,
        count,
        to_address: from,
        block_number: blockNumber,
        state: OrderState.HASH
      });
    }

    await tokenStatusStore.setBlockId(this.token_id, id);
  }

  @tryLock('confirm_lock')
  public async confirm() {
    const orders = await orderStore.findAll({
      where: { state: [ OrderState.HASH, OrderState.WAIT_CONFIRM ] }
    });

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const { id, state, type, txid } = order;
      if (state == OrderState.HASH) {
        const ob = await web3.eth.getTransaction(txid);
        if (!_.isNil(ob.blockNumber)) {
          const up = await orderStore.waitConfirm(id, ob.blockNumber);
          if (!up) logger.error(`wait confirm ${id} failed`);
        }
      }

      const ob = await web3.eth.getTransactionReceipt(txid);
      if (!ob)
        continue;

      console.log(ob);
      const { status } = ob;
      const done = await orderStore.finish(id, status);
      if (!done) logger.error(`finish ${id} ${status} failed`);
    }
  }

  public async collect() {

  }

  public async withdraw() {

  }

}
