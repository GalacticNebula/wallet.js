
import { process_init } from '../common/utils/process_init';
process_init();

import * as _ from 'lodash';
import cron from 'node-cron';
import { logger, env } from '@common/utils';

const timezone = 'Asia/Shanghai';

interface CRON {
  schedule: string;
  callback: () => Promise<void>;
}

const CRONS: CRON[] = [
  {
    schedule: 'CRON_FOO',
    callback: bar
  }
];

async function bar() {

}

function run() {
  CRONS.forEach(c => {
    const v = env.get(c.schedule);
    if (!_.isEmpty(v)) {
      const task = cron.schedule(v, async () => await c.callback(), { timezone });
      task.start();
      console.log(`startd ${c.schedule}: ${v}`);
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
