# API列表

## 0. 概述
HOST=IP:Port，例如HOST

## 1. Auth

### 1.1. 发送短信
```
http://HOST/ant/sendSms
POST  'Content-Type: application/json'
{
  phone: '18700000001'
}
```

### 1.2. 注册用户
```
http://HOST/ant/register
POST  'Content-Type: application/json'
{
  phone: string;       // 电话号码
  password: string;    // 登录密码
  invitecode: string;  // 8位邀请码
  scode: string;       // 6位短信验证码
}
```

### 1.3. 登录
```
http://HOST/ant/login
POST  'Content-Type: application/json'
{
  phone: string;      // 电话号码
  password: string;   // 登录密码
}
```

### 1.4. 登出
```
http://HOST/ant/logout
GET
```

### 1.5. 开启/关闭在线
```
http://HOST/ant/toggle/online
POST  'Content-Type: application/json'
{
  status: number;      // 0 | 1
}
```

### 1.6. 开启/暂停接单
```
http://HOST/ant/toggle/working
POST  'Content-Type: application/json'
{
  status: number;      // 0 | 1
}
```

### 1.7. 用户信息
```
http://HOST/ant/userInfo
GET
```

### 1.8. 积分明细
```
http://HOST/ant/record
GET
{
  type: string;       // 类型，不填则是全部
  page: number;       // 页号 (default 0)
  pageSize: number;   // 页大小 (default 10)
}
```

### 1.9. 下级列表
```
http://HOST/ant/children
GET
{
  page: number;       // 页号 (default 0)
  pageSize: number;   // 页大小 (default 10)
}
```

## 2. Card

### 2.1. 增加卡
```
http://HOST/ant/card/new
POST  'Content-Type: application/json'
{
  type: number;      // 0: BANK   1: ALIPAY
  bank: string;      // 银行，例如'工商银行'
  branch: string;    // 支行, 例如'东湖支行'
  name: string;      // 户名，例如'张三'
  cardno: string;    // 卡号
  qrcode: string;    // 二维码 (选填)
}
```

### 2.2. 列出卡
```
http://HOST/ant/card/list
GET
{
  type: string;    // 0: BANK   1: ALIPAY
}
```

### 2.3. 删除卡
```
http://HOST/ant/card/:id
DEL
```

### 2.4. 启用或禁止卡
```
http://HOST/ant/card/:id/:enabled
PUT
{
  enabled: number;    // 0 | 1
}
```

## 3. Order

### 3.1. 查询订单
```
http://HOST/ant/orders
GET
{
  active: number;     // 1: 当前订单   0: 历史订单    不填为全部
  page: number;       // 页号 (default 0)
  pageSize: number;   // 页大小 (default 10)
}
```

### 3.2. 确认订单
```
http://HOST/ant/order/:id/confirm
PUT
{}
```

### 3.3. 申请充值
```
http://HOST/ant/recharge
POST 'Content-Type: application/json'
{
  amount_min: number;       // 充值区间下限
  amount_max: number;       // 充值区间上限
  card_id: number;          // 卡ID
}
```

### 3.4. 列出充值申请
```
http://HOST/ant/recharge
GET
{}
```

### 3.5. 取消充值申请
```
http://HOST/ant/recharge
DEL
{}
```

### 3.6. 列出P2P订单
```
http://HOST/ant/p2porder
GET
{
  active: number;     // 1: 当前订单   0: 历史订单    不填为全部
  page: number;       // 页号 (default 0)
  pageSize: number;   // 页大小 (default 10)
}
```

### 3.7. 取消P2P订单
```
http://HOST/ant/p2porder
DEL
{
  id: number;         // 订单ID
}
```

### 3.8. P2P订单已付款
```
http://HOST/ant/p2porder
PUT
{
  id: number;         // 订单ID
  receipt: string;    // 凭证地址
}
```

### 3.9. 申请提现
```
http://HOST/ant/withdraw
POST 'Content-Type: application/json'
{
  amount: number;           // 充值金额
  card_id: number;          // 卡ID
}
```

### 3.10. 列出提现订单
```
http://HOST/ant/withdraw
GET
{}
```

### 3.11. 提现确认
```
http://HOST/ant/withdraw
PUT
{}
```


## 4. Merchant

### 4.1. 获取Token
```
http://HOST/merchant/token
POST 'Content-Type: application/json'
{
  merchant_id: number;         // 商户ID
  orderid: string;             // 商户平台的订单ID
  uid: string;                 // 商户平台的用户ID
  amount: number;              // 充值金额
  pay_type: number;            // 充值通道 0: 银行卡   1: 支付宝    2: 支转卡
}

```

### 4.2. 查询订单
```
http://HOST/merchant/mquery
GET
{
  merchant_id: number;         // 商户ID
  orderid: string;             // 商户平台的订单ID
  token: string;               // 4.1中返回的token
}

response:
{
  merchant_id: number;         // 商户ID
  orderid: string;             // 商户平台的订单ID
  uid: string;                 // 商户平台的用户ID
  amount: number;              // 充值金额
  pay_type: number;            // 充值通道 0: 银行卡   1: 支付宝    2: 支转卡
  state: number;               // 订单状态 0: 创建     1: 已匹配    2: 已确认
                               //          3: 已取消  4: 已超时    5: 失败
  paid: number;                // 是否支付  0: 未支付    1: 已支付
}

商户平台收到本回应之后需要验签 (response header中的signature字段)
1) 对response中的字段按字母顺序排序
2) 用&连接参数，例如
  "amount=1&merchant_id=2&orderid=123456&paid=1&pay_type=0&state=2&uid=100"
3) 做sha256加密，secret为平台为商户分配的密钥
4) 转为base64
5) 将1-4执行后的到的字符串，与signature字段比较，符合则通过
```

## 5. H5

### 5.1. 下单
```
http://HOST/merchant/apply
POST 'Content-Type: application/json'
{
  merchant_id: number;         // 商户ID
  orderid: string;             // 商户平台的订单ID
  uid: string;                 // 商户平台的用户ID
  amount: number;              // 充值金额
  pay_type: number;            // 充值通道 0: 银行卡   1: 支付宝    2: 支转卡
  token: string;               // 4.1中返回的token
}
```

### 5.2. 查询订单
```
http://HOST/merchant/query
GET
{
  merchant_id: number;         // 商户ID
  orderid: string;             // 商户平台的订单ID
  token: string;               // 4.1中返回的token
}
```

### 5.3. 设置状态
```
http://HOST/merchant/state
POST 'Content-Type: application/json'
{
  merchant_id: number;         // 商户ID
  orderid: string;             // 商户平台的订单ID
  state: number;               // 0: 取消支付    1: 已支付
  token: string;               // 4.1中返回的token
}
```
