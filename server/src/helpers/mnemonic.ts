
import * as bip39 from 'bip39';
import { hdkey } from 'ethereumjs-wallet';
//import * as util from 'ethereumjs-util';

class Mnemonic {
  
  public async toPrivateKey(mnemonic: string, derivePath: string) {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const hdWallet = hdkey.fromMasterSeed(seed);
    const key = hdWallet.derivePath(derivePath);
    return key.getWallet().getPrivateKeyString();
  }

  public async toAddress(mnemonic: string, derivePath: string) {
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const hdWallet = hdkey.fromMasterSeed(seed);
    const key = hdWallet.derivePath(derivePath);
    return key.getWallet().getAddressString();
  }

}

export const mnemonic = new Mnemonic();
