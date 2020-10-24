
export enum AddressType {
  WITHDRAW = 0,
  COLLECT = 1,
  GAS = 2
}

export enum SupportState {
  SUPPORT = 1,
  NOT_SUPPORT = 2
}

export enum OutOrIn {
  OUT = 1,
  IN = 2
}

export enum OrderType {
  RECHARGE = 1,
  WITHDRAW = 2
}

export enum OrderState {
  CREATED = 0,          // 提起交易
  HASH = 1,             // 交易已经⼴播，⽣成了hash
  CONFIRM = 2,          // 交易上链已确认
  HASH_FAILED = 3,      // 交易⼴播失败
  TOBC_FAILED = 4,      // 交易上链失败
  WAIT_CONFIRM = 5,     // 交易已经上链，等待达到确认数
}

export enum OrderCollectState {
  NONE = 0,
  HASH = 1,
  DONE = 2
}

export enum ChainType {
  ETH = 'eth',
  BTC = 'btc',
  OMNI = 'omni',
  EOS = 'eos'
}
