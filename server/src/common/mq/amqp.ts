
import { connect, Channel, ConsumeMessage, credentials } from 'amqplib';
import * as _ from 'lodash';
import { logger, hmacSha1, env } from '@common/utils';

const hostname = env.get('AMQP_HOST');
const vhost = env.get('AMQP_VHOST', '/');
const username = env.get('AMQP_USER', 'guest');
const password = env.get('AMQP_PASSWD', 'guest');
const port = env.getNumber('AMQP_PORT', 5672);

const accessKeyId = env.get('AMQP_ACCESS_KEY_ID');
const accessKeySecret = env.get('AMQP_ACCESS_KEY_SECRET');
const resourceOwnerId = env.get('AMQP_RESOURCE_OWNER_ID');

interface Task {
  action: string;
  time?: Date;
  data?: any;
}

function connectMQ() {
  const options: any = { hostname, vhost, port };
  if (!_.isEmpty(accessKeyId)) {
    const timestamp = Date.now().toString();
    const name = Buffer.from([ 0, accessKeyId, resourceOwnerId ].join(':')).toString('base64');
    const pass = Buffer.from([ hmacSha1(accessKeySecret, timestamp).toString().toUpperCase(), timestamp ].join(':')).toString('base64');
    _.assign(options, { credentials: credentials.plain(name, pass) });
  } else {
    _.assign(options, { username, password });
  }

  return connect(options);
}

async function pushTask(queue: string, task: Task) {
  let conn;

  if (_.isNil(task.time))
    task.time = new Date();

  try {
    conn = await connectMQ();
    const ch = await conn.createChannel();
    await ch.assertQueue(queue, { durable: true });
    
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(task)), { deliveryMode: true });

    await ch.close();
  } catch (e) {
    logger.error(`pushTask: ${e.toString()}`);
  } finally {
    conn?.close();
  }
}

async function popTask(queue: string, worker: (ch: Channel, msg: ConsumeMessage | null) => Promise<void>) {
  const conn = await connectMQ();

  const ch = await conn.createChannel();
  await ch.prefetch(1);
  await ch.assertQueue(queue, { durable: true });

  ch.consume(queue, async (msg) => await worker(ch, msg), { noAck: false });
}

export { pushTask, popTask, Task, Channel, ConsumeMessage };
