import _ from 'lodash';
import Web3 from 'web3';
import cron from 'node-cron';
import BaseService from './base.service';
import { Code, OrderState, OrderType, OutOrIn } from "@common/enums";
import { Exception } from "@common/exceptions";
import { TokenModel } from "@models/token.model";
import { orderStore, tokenStatusStore, tokenStore, userWalletStore } from "@store/index";
import { ERC20_CONFIG, findErc20Config } from '@config/erc20';
import { logger, min } from '@common/utils';

const web3 = new Web3(Web3.givenProvider || 'https://kovan.infura.io/v3/bd8e235958e54c08a0cc78d34d26612a');

const timezone = 'Asia/Shanghai';

export class Erc20Service extends BaseService {

  private deposit_lock = false;
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
  }

  public async deposit() {
    if (this.deposit_lock)
      return;

    this.deposit_lock = true;

    try {
      await this.depositLocked();
    } catch (e) {
      logger.error(e.toString());
    }

    this.deposit_lock = false;
  }

  public async depositLocked() {
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
        timestamp: Date.now(),
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

  public async withdraw() {

  }

  public async collect() {

  }

  public async confirm() {

  }

}
