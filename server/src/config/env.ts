
export const NODE_ENV = process.env.NODE_ENV;

export const ANT_PORT = Number(process.env.API_PORT) || 80;

export const ADMIN_PORT = process.env.ADMIN_PORT || 80;

export const STATISTIC_CHECK_DAYS = Number(process.env.STATISTIC_CHECK_DAYS) || 60;

export const SOCKET_PORT = Number(process.env.SOCKET_PORT) || 80;
export const SOCKET_PREFIX = process.env.SOCKET_PREFIX || '/test';

export const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
export const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;

// mysql
export const DB_HOST = process.env.MYSQL_HOST || 'db';
export const DB_PORT = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
export const DB_USERNAME = process.env.MYSQL_USERNAME || 'root';
export const DB_PASSWORD = process.env.MYSQL_PASSWORD || '123456';
export const DB_NAME = process.env.MYSQL_DATABASE || 'ant';

/**
 * google auth
 */
export const GOOGLE_AUTH_ISSUER = process.env.ISSUER || 'TLY_ANT';

/**
 * logger
 */
export const SYSLOG_HOST = process.env.SYSLOGD_HOST || '192.168.0.143';
export const SYSLOG_PORT = Number(process.env.SYSLOGD_PORT) || 514;
export const SYSLOG_PROTOCOL = process.env.SYSLOGD_PROTOCOL || 'U';
export const SYSLOG_TAG = process.env.SYSLOGD_TAG || 'antdev';

