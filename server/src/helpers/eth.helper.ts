import Web3 from 'web3';
import { MNEMONIC } from '@config/env';
import { mnemonic } from './mnemonic';

class EthHelper {
  public web3: Web3;

  constructor() {
    this.web3 = new Web3(Web3.givenProvider || 'https://kovan.infura.io/v3/bd8e235958e54c08a0cc78d34d26612a');
  }

  public createWallet(uid: number) {
    return mnemonic.toAddress(MNEMONIC, "m/44'/60'/0'/0/" + uid);
  }

  public privateKey(uid: number) {
    return mnemonic.toPrivateKey(MNEMONIC, "m/44'/60'/0'/0/" + uid);
  }

}

export const ethHelper = new EthHelper();
