import { MNEMONIC } from '@config/env';
import { mnemonic } from './mnemonic';

class EthHelper {

  public createWallet(uid: number) {
    return mnemonic.toAddress(MNEMONIC, "m/44'/60'/0'/0/" + uid);
  }

  public privateKey(uid: number) {
    return mnemonic.toPrivateKey(MNEMONIC, "m/44'/60'/0'/0/" + uid);
  }

}

export const ethHelper = new EthHelper();
