import Web3 from 'web3';
import { MNEMONIC } from '@config/env';
import { mnemonic } from './mnemonic';

const ETH_NODE = process.env.ETH_NODE || '';

class EthHelper {
  public web3: Web3;

  constructor() {
    this.web3 = new Web3(Web3.givenProvider || ETH_NODE);
  }

  public createWallet(uid: number) {
    return mnemonic.toAddress(MNEMONIC, "m/44'/60'/0'/0/" + uid);
  }

  public privateKey(uid: number) {
    return mnemonic.toPrivateKey(MNEMONIC, "m/44'/60'/0'/0/" + uid);
  }

  public async balance(address: string) {
    const { web3 } = this;
    const gasBalance = web3.utils.toBN(await web3.eth.getBalance(address));
    return gasBalance;
  }

  public async estimateGas(from: string) {
    const { web3 } = this;
    const gasLimit = await web3.eth.estimateGas({ from });
    const price = await web3.eth.getGasPrice();
    const gasPrice = web3.utils.toBN(price);
    return web3.utils.toBN(gasLimit).mul(gasPrice);
  }

}

export const ethHelper = new EthHelper();
