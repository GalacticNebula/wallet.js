
import { process_init } from '../common/utils/process_init';
process_init();

import { ethHelper } from "@helpers/index";

async function transfer() {
    const web3 = ethHelper.web3;
    const toBN = web3.utils.toBN;

    const from = '0x87Eea07540789af85B64947aEA21A3f00400B597';
    const to = '0x1904BFcb93EdC9BF961Eead2e5c0de81dCc1D37D';
    const count = 10;
    const privateKey = '6f6c9593acd7041e1d482ca12ed021759a032cbb18d175a828922734484237b8';

    const gasLimit = await web3.eth.estimateGas({ from });
    const price = await web3.eth.getGasPrice();
    const gasPrice = web3.utils.toBN(price);
    const gasFee = toBN(gasLimit).mul(gasPrice);
    const nonce = await web3.eth.getTransactionCount(from);
    const total = gasFee.add(toBN(count));

    const signedTx = await web3.eth.accounts.signTransaction({
      gas: gasLimit,
      gasPrice: gasPrice.toString(),
      nonce,
      to,
      value: count
    }, privateKey);

    try {
        const tx = await web3.eth
            .sendSignedTransaction(signedTx.rawTransaction || '')
            .on('transactionHash', async (txid: string) => {
                console.log(`txid=${txid}`);
            });
    } catch (e) {
        console.log(`hash failed, ${e.toString()}`);
    }
}

async function run() {
    const cnt = 100;
    for (let i = 0; i < cnt; i++) {
        await transfer();
    }

}

run();

