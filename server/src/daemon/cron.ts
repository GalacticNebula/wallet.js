
import { process_init } from '../common/utils/process_init';
process_init();

import _ from 'lodash';
import cron from 'node-cron';
import { logger, env } from '@common/utils';
import { Schedule } from './schedule';
import { Erc20USDTDeposit } from './erc20_usdt_deposit';

const timezone = 'Asia/Shanghai';

const CRONS: Schedule[] = [
  new Erc20USDTDeposit()
];

function run() {
  CRONS.forEach(c => {
    const v = env.get(c.cron);
    if (!_.isEmpty(v)) {
      const task = cron.schedule(v, async () => await c.run(), { timezone });
      task.start();
      console.log(`startd ${c.cron}: ${v}`);
    }
  });
}

if (require.main === module) {
  try {
    run();
    logger.info('cron run');
  } catch(e) {
    logger.error(`cron: ${e.toString()}`);
  }
}
