/**
 * pay
 */

export const QRCODE_PAYS = ['ALIPAY', 'WebMM', 'UNIPAY', 'QQPAY', 'JUHE'];

export const PAY_NAME: Record<string, string> = {
  WebMM: '微信',
  ALIPAY: '支付宝',
  UNIPAY: '云闪付',
  QQPAY: 'QQ支付',
  JUHE: '聚合支付',
  BANK: '银行卡',
  A2BANK: '支转卡',
  W2BANK: '微转卡',
};

/**
 * socket rooms
 */

export const SOCKET_BROADCAST_ROOM = 'SOCKET_BROADCAST_ROOM';
type SOCKET_BROADCAST_ROOM = typeof SOCKET_BROADCAST_ROOM;

export const SOCKET_WD_ORDERS_ROOM = 'SOCKET_WD_ORDERS_ROOM';
type SOCKET_WD_ORDERS_ROOM = typeof SOCKET_WD_ORDERS_ROOM;

export type SOCKET_ROOM = SOCKET_WD_ORDERS_ROOM | SOCKET_BROADCAST_ROOM;

export const SOCKET_ROOMS: SOCKET_ROOM[] = [SOCKET_BROADCAST_ROOM, SOCKET_WD_ORDERS_ROOM];

/**
 * socket events
 */

// socket.io 上的 event
export const SOCKET_MESSAGE = 'message';
export type SOCKET_MESSAGE = typeof SOCKET_MESSAGE;

export const SOCKET_WD_ORDERS = 'SOCKET_WD_ORDERS';
export type SOCKET_WD_ORDERS = typeof SOCKET_WD_ORDERS;

export const SOCKET_NOTICES = 'SOCKET_NOTICES';
export type SOCKET_NOTICES = typeof SOCKET_NOTICES;

export type SOCKET_EVENTS = SOCKET_WD_ORDERS | SOCKET_NOTICES | SOCKET_MESSAGE;

export const PROJECT_NAME = 'ant';
export const WORKER_QUEUE = 'workerQueue';

export enum Role {
  ADMIN = 0,
  MERCHANT = 1,
  AGENT = 2,
  SYSTEM = 3
}
