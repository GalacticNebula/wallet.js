import { process_init } from '../common/utils/process_init';
process_init();
import { sequelize } from '@common/dbs';
import { chainRepository, configRepository, tokenRepository, tokenStatusRepository, addressRepository } from '@models/index';

async function work() {
    await sequelize.sync({ force: true });

    await configRepository.bulkCreate([
        {
            name: 'web_status',
            value: '1'
        }
    ]);

    await tokenRepository.bulkCreate([
        {
            symbol: 'ETH',
            address: '-1',
            name: '以太坊',
            decimals: 18,
            chain: 'eth',
            state: 1,
            limit_num: 100000000
        },
        {
            symbol: 'USDT',
	    //address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',  // 正式链
	    address: '0xec5d302243bc460e9d38f94852f0538571abd4ee',    // 测试链
            name: 'Tether',
            decimals: 6,
            chain: 'eth',
            state: 1,
            limit_num: 1000000
        }
    ]);

    await tokenStatusRepository.bulkCreate([
        {
            token_id: 1,
            block_id: 0
        },
        {
            token_id: 2,
            block_id: 21674441
        }
    ]);

    await chainRepository.bulkCreate([
        {
            chain: 'eth',
            confirmations1: 6,
            confirmations2: 6,
            state: 1,
            token_id: 1
        }
    ]);

    await addressRepository.bulkCreate([
        {
	    type: 0,  // 提币账户
	    chain: 'eth',
	    address: '0x7676239e4052ABae6Dcae95e399CBd77666f7694',
	    private_key: 'b1ef6d40549027820138727510e064b54f32bd7c75e6f9fc7aa3247154be6231'
	},
        {
	    type: 1,  // 归集账户
	    chain: 'eth',
	    address: '0x31ed5ED27ac272e6E1B914b6e18Cf676d33492aB',
	    private_key: '7975c9974f103ebb32c89145370d2699488d22fd69cf3aac2c3102b5de03de07'
	},
        {
	    type: 2,  // Gas账户
	    chain: 'eth',
            address: '0xb18eA22632C4bb7fa456700Ff812d829ACeffC78',
	    private_key: '8c210e9a7a91c1041d81502be849e1f8124fb68a9980d87b0ae4bd22b9b88745'
	}
    ]);
}

work()
.then(() => {
    console.log('done.');
    process.exit(0);
})
.catch(e => {
    console.log(e);
});
