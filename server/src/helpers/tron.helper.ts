import { MNEMONIC } from '@config/env';
import { mnemonic } from './mnemonic';

const TronWeb = require('tronweb');

class TronHelper {

  private client: any;

  constructor() {
    // Mainnet: 'https://api.trongrid.io'
    this.client = new TronWeb({ fullHost: 'https://api.shasta.trongrid.io' });
  }

  public async createWallet(uid: number) {
    const privateKey = await this.privateKey(uid);

/*
    import hdkey from 'hdkey';
    import { ec } from 'elliptic';
    import { keccak256 } from 'js-sha3'

    const secp256k1: any = new ec('secp256k1');

    const keyPair = secp256k1.keyFromPrivate(privateKey, 'hex');
    const publicKey = keyPair.getPublic('hex');
    const add = keccak256(Buffer.from(publicKey.slice(2), 'hex')).slice(64 - 40);
    const hex = `41${add.toString()}`;
    const address = this.client.address.fromHex(hex);
*/

    return this.client.address.fromPrivateKey(privateKey);
  }

  public privateKey(uid: number) {
    return mnemonic.toPrivateKey(MNEMONIC, "m/44'/195'/0'/0/" + uid);
  }

}

export const tronHelper = new TronHelper();
