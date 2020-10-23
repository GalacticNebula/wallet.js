
import { process_init } from '../common/utils/process_init';
process_init();

import _ from 'lodash';
import cron from 'node-cron';
import { logger, env } from '@common/utils';
import { Erc20Service } from '@service/index';

const timezone = 'Asia/Shanghai';

async function run() {
  const usdt = await Erc20Service.create(2);
}

if (require.main === module) {
  run()
  .then(() => {
    console.log('cron done.');
  })
  .catch(e => {
    logger.error(`cron: ${e.toString()}`);
  })
}
