
export enum Power {
  ADMIN_ACCOUNT = (1 << 0),
  AGENT_ACCOUNT = (1 << 1),
  MERCHANT_ACCOUNT = (1 << 2),
  USER_ACCOUNT = (1 << 3),
  BALANCE = (1 << 4),
  IP = (1 << 5),
  ORDER = (1 << 6),
  P2P_ORDER = (1 << 7),
  USER_WITHDRAW = (1 << 8),
  MERCHANT_WITHDRAW = (1 << 9),
  AGENT_WITHDRAW = (1 << 10),
  LEVEL = (1 << 11),
  CONFIG = (1 << 12),
  CARD = (1 << 13),
  POWER = (1 << 14)
}
