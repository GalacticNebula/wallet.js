import { process_init } from '../common/utils/process_init';
process_init();
import { sequelize } from '@common/dbs';
import { chainRepository, configRepository, tokenRepository, tokenStatusRepository } from '@models/index';

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
            limit_num: 1000000000000000000
        },
        {
            symbol: 'USDT',
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
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
            block_id: 0
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
}

work()
.then(() => {
    console.log('done.');
    process.exit(0);
})
.catch(e => {
    console.log(e);
});
