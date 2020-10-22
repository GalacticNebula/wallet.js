import _ from 'lodash';
import { createLogger, format, transports } from 'winston';
import moment from 'moment';

const { combine, printf } = format;
const { Rsyslog } = require('winston-rsyslog');

const host = process.env.SYSLOGD_HOST || '';
const port = Number(process.env.SYSLOGD_PORT) || 514;
const protocol = process.env.SYSLOGD_PROTOCOL || 'U';
const tag = process.env.SYSLOGD_TAG || 'ant';
const debug = process.env.NODE_ENV == 'development';

const timestamp = () => moment().format('YYYY-MM-DD HH:mm:ss');

const trans = [ new transports.Console() ];
if (!debug && !_.isEmpty(host))
  trans.push(new Rsyslog({ host, port, protocol, tag }));

const logger = createLogger({
  level: debug ? 'debug' : 'error',
  format: combine(
    printf(info => `[${timestamp()}] ${info.level} ${info.message}`),
  ),
  transports: trans
});

export { logger };
