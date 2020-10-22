
import { process_init } from '../common/utils/process_init';
process_init();

import { MNEMONIC } from '@config/env';
import { mnemonic } from '@helpers/mnemonic';

async function run() {
    const address = await mnemonic.toAddress(MNEMONIC, "m/44'/60'/0'/0/" + 1);
    const privateKey = await mnemonic.toPrivateKey(MNEMONIC, "m/44'/60'/0'/0/" + 1);

    console.log(address);
    console.log(privateKey);
}

run();
