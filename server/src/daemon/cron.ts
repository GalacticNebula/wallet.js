
import { process_init } from '../common/utils/process_init';
process_init();

import _ from 'lodash';
import cron from 'node-cron';
import { logger, env } from '@common/utils';
import { Erc20Service, EthService } from '@service/index';
import { addressStore, tokenStore } from '@store/index';
import { Exception } from '@common/exceptions';
import { Code } from '@common/enums';
import { Trc20Service } from '@service/trc20.service';

const timezone = 'Asia/Shanghai';

const { env } = process;

async function run() {
  const token_id = _.defaultTo(Number(env.token_id), 0);
  const token = await tokenStore.findById(token_id);
  if (!token) {
    logger.error(`token ${token_id} not found`);
    return;
  }

  const { chain, symbol, address } = token;

  if (chain == 'eth') {
    if (address == '-1')
      await EthService.create(token_id);
    else
      await Erc20Service.create(token_id);
  } else if (chain == 'tron') {
    await Trc20Service.create(token_id);
  } else {
    throw new Exception(Code.SERVER_ERROR, `token ${token_id} not implement now`);
  }
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
