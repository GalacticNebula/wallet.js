import { init } from './init';
init();
import { sequelize } from '@common/dbs';
import { configRepository } from '@models/index';

async function work() {
    await sequelize.sync({ force: true });

    await configRepository.bulkCreate([
        {
            name: 'web_status',
            value: '1'
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
