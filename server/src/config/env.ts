

const { env } = process;

export const NODE_ENV = env.NODE_ENV;

export const API_PORT = Number(env.API_PORT) || 80;
export const ADMIN_PORT = Number(env.ADMIN_PORT) || 80;

export const DB_HOST = env.MYSQL_HOST || 'db';
export const DB_PORT = env.MYSQL_PORT ? Number(env.MYSQL_PORT) : 3306;
export const DB_USERNAME = env.MYSQL_USERNAME || 'root';
export const DB_PASSWORD = env.MYSQL_PASSWORD || '123456';
export const DB_NAME = env.MYSQL_DATABASE || 'wallet';

export const REDIS_HOST = env.REDIS_HOST || '127.0.0.1';
export const REDIS_PORT = Number(env.REDIS_PORT) || 6379;

export const SYSLOG_HOST = env.SYSLOGD_HOST || '192.168.0.143';
export const SYSLOG_PORT = Number(env.SYSLOGD_PORT) || 514;
export const SYSLOG_PROTOCOL = env.SYSLOGD_PROTOCOL || 'U';
export const SYSLOG_TAG = env.SYSLOGD_TAG || 'antdev';

export const MNEMONIC = env.MNEMONIC || '';

