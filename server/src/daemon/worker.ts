import { process_init } from '../common/utils/process_init';
process_init();

import _ from 'lodash';
import axios from 'axios';
import { env, logger, sign } from '@common/utils';
import { popTask, Channel, ConsumeMessage } from '@common/mq';
import { WORKER_QUEUE } from '@common/constants';
import { callbackStore, orderStore } from '@store/index';
import { Assert, Exception } from '@common/exceptions';
import { Code } from '@common/enums';

const WORKERS: { [key: string]: (data: any) => Promise<void> } = {
  ['callback']: callbackTasklet
};

async function callbackTasklet(data: any) {
  try {
    const { order_id } = data;
    const secret = env.get('SIGN_SECRET');

    const order = await orderStore.findById(order_id);
    if (!order) throw new Exception(Code.SERVER_ERROR, `order ${order_id} not found`);

    const params = order.serializer();
    const signature = sign(params, secret);

    const cb = await callbackStore.findById(1);
    if (!cb) throw new Exception(Code.SERVER_ERROR, 'callback not found');

    const { status } = await axios.get(cb.call_url_path, {
      params,
      timeout: 10000,
      headers: {
        'content-type': 'application/json',
        signature
      }
    });

    Assert(status == 200, Code.SERVER_ERROR, `callback failed, status=${status}`);
  } catch (e) {
    logger.error(e.toString());
  }
}

async function worker(ch: Channel, msg: ConsumeMessage | null) {
  if (!msg)
    return;

  try {
    const { action, data } = JSON.parse(msg.content.toString());
    const fn = _.get(WORKERS, action);

    if (!_.isNil(fn)) {
      try {
        await fn(data);
      } catch (e) {
        logger.error(`worker error: ${e.toString()} ${msg.content}`);
      }
    } else {
     logger.error('undefined action: ' + action);
    }

    await ch.ack(msg);
  } catch (e) {
    logger.error(`worker error2: ${e.toString()} ${msg.content}`);
  }
}

async function run() {
  await popTask(WORKER_QUEUE, worker);
}

if (require.main === module) {
  run()
  .then(() => logger.info('work queue run'))
  .catch(e => {
    logger.error(`worker: ${e.toString()}`);
  });
}