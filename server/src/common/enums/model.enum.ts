export enum SmsCodeCategory {
  REGISTER = 'REGISTER',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  LOGIN = 'LOGIN',
  CHANGE_FUND_PASSWORD = 'CHANGE_FUND_PASSWORD',
  FORGET_PASSWORD = 'FORGET_PASSWORD',
  UNBIND_GOOGLE_AUTH = 'UNBIND_GOOGLE_AUTH',
}

// {'order': '接单', 'fee': '佣金收入', 'agent': '代理分成', 'board': '后台修改',  'tax': '服务费'}
export enum BalanceRecordType {
  ORDER = 'order',
  FEE = 'fee',
  AGENT = 'agent',
  BOARD = 'board',
  TAX = 'tax',
  RECHARGE = 'recharge',
  WITHDRAWAL = 'withdrawal',
  GRAB_RECHARGE = 'grab_recharge',
  GRAB_WITHDRAWAL = 'grab_withdrawal',
  FEE_TO_BALANCE = 'fee_to_balance',
  TRANSFER = 'transfer',
}

export const BalanceRecordTypeText: Record<string, string> = {
  [BalanceRecordType.ORDER]: '接单',
  [BalanceRecordType.FEE]: '佣金收入',
  [BalanceRecordType.AGENT]: '代理分成',
  [BalanceRecordType.BOARD]: '人工修改',
  [BalanceRecordType.TAX]: '服务费',
  [BalanceRecordType.RECHARGE]: '充值',
  [BalanceRecordType.WITHDRAWAL]: '提现',
  [BalanceRecordType.GRAB_RECHARGE]: '接充值单',
  [BalanceRecordType.GRAB_WITHDRAWAL]: '接提现单',
  [BalanceRecordType.FEE_TO_BALANCE]: '佣金转本金',
  [BalanceRecordType.TRANSFER]: '转账',
};

export enum BalanceCategory {
  FEE = 'fee',
  BALANCE = 'balance',
}

export enum CardOwner {
  SYS = 'SYS',
  ANT = 'ANT',
}

export enum CardType {
  BANK = 0,
  ALIPAY = 1,
  WebMM = 2,
  JUHE = 3
}

export enum CardState {
  INIT = 0,     // 待审核
  OK = 1,       // 已审核
  REJECT = 2,   // 已驳回
}

export enum CardStatus {
  OK = 'OK', // 正常
  UNVERIFY = 'UNVERIFY', // 未验证
  CANCEL = 'CANCEL', // 注销
  LOSS = 'LOSS', // 挂失
  PWDERR = 'PWDERR', // 密码错误
}

export enum CardRateType {
  RECHARGE = 'recharge',
  WITHDRAWAL = 'withdrawal',
}

export enum AsyncTaskStatus {
  CREATED = 'created',
  SUCCESS = 'success',
  FAIL = 'fail',
}

export enum PaidCode {
  OK = 0,
  PAID = 1,
  LAST_STEP = 2,
  PAID_FAIL = 3,
  E_LOGIN_NAME = 4, // 手机银行登陆名错
  E_LOGIN_PWD = 5, // 手机银行密码错
  E_TRADE_PWD = 6, // 手机银行交易密码错
  NO_MOBILE_INFO = 7, // 未填手机银行账密
  UNVERIFY = 8, // 需要验证
}

export enum NoticeCategory {
  sys = 'sys',
  ant = 'ant',
}

export enum AntIdentity {
  SUPER = 'SUPER',
  SUPER_CHILD = 'SUPER_CHILD',
  MEMBER = 'MEMBER',
}

export enum CardQStatus {
  OK = 0,
  NO_START = 1, // 未启动，当然也就未接入
  NO_JOIN = 2, // 已启动，未接入
}

export enum MobileDeviceBusyType {
  CARD = 'card',
  ORDER = 'order',
}
