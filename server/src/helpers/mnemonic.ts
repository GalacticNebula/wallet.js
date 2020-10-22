
import * as bip39 from 'bip39';
import { hdkey } from 'ethereumjs-wallet';
import * as util from 'ethereumjs-util';

class Mnemonic {
  
  public toPrivateKey(mnemonic: string, derivePath: string) {
    const seed = bip39.mnemonicToSeed(mnemonic);
    const hdWallet = hdkey.fromMasterSeed(seed);
    const key = hdWallet.derivePath(derivePath);
    return util.bufferToHex(key._hdkey._privateKey);
  }

  public toAddress(mnemonic: string, derivePath: string) {
    const seed = bip39.mnemonicToSeed(mnemonic);
    const hdWallet = hdkey.fromMasterSeed(seed);
    const key = hdWallet.derivePath(derivePath);
    const address = util.pubToAddress(key._hdkey._publicKey, true);
    return util.toChecksumAddress(address.toString('hex'));
  }

}

export const mnemonic = new Mnemonic();
