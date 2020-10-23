import Joi from '@hapi/joi';
import { Route } from '@common/interfaces';
import { RequestMethod } from '@common/enums';
import fieldReg from '@common/field_reg';
import { api } from '@controller/api';

const prefix = '/api';

const routes: Route[] = [
  {
    name: 'timestamp',
    path: '/timestamp',
    method: RequestMethod.GET,
    action: api.apiController.timestamp,
    isAttachment: true
  },
  {
    name: 'create wallet',
    path: '/wallet/new',
    method: RequestMethod.POST,
    params: Joi.object({
      user_id: Joi
        .number()
        .integer()
        .required(),
      chain: Joi
        .string()
        .trim()
        .pattern(/^eth$|^omni$|^btc$|^eos$/)
    }),
    action: api.apiController.createWallet
  },
  {
    name: 'get wallet',
    path: '/wallet/address',
    method: RequestMethod.GET,
    params: Joi.object({
        user_id: Joi
          .number()
          .integer()
          .required()
    }),
    action: api.apiController.getWallet,
  },
  {
    name: 'list token',
    path: '/token/list',
    method: RequestMethod.GET,
    action: api.apiController.listToken
  },
  {
    name: 'add token',
    path: '/token/add',
    method: RequestMethod.POST,
    params: Joi.object({
      contract_address: Joi
        .string()
        .trim()
        .required(),
      chain: Joi
        .string()
        .trim()
        .pattern(/^eth$|^omni$|^btc$|^eos$/)
        .required(),
      symbol: Joi
        .string()
        .trim()
        .required(),
      name: Joi
        .string()
        .trim()
        .required(),
      decimals: Joi
        .number()
        .integer()
        .min(0)
        .required(),
      limit_num: Joi
        .number()
        .integer()
        .min(0)
        .required()
    }),
    action: api.apiController.addToken
  },
  {
    name: 'update token',
    path: '/token/update',
    method: RequestMethod.POST,
    params: Joi.object({
      token_id: Joi
        .number()
        .integer()
        .required(),
      name: Joi
        .string()
        .trim(),
      state: Joi
        .number()
        .integer()
        .valid(1, 3),
      limit_num: Joi
        .number()
        .integer()
        .min(0)
    }),
    action: api.apiController.updateToken
  },
  {
    name: 'list chain',
    path: '/chain/list',
    method: RequestMethod.GET,
    action: api.apiController.listChain
  },
  {
    name: 'update chain',
    path: '/chain/update',
    method: RequestMethod.POST,
    params: Joi.object({
      chain: Joi
        .string()
        .trim()
        .pattern(/^eth$|^omni$|^btc$|^eos$/)
        .required(),
      type: Joi
        .number()
        .integer()
        .valid(1, 2)
        .required(),
      confirmations: Joi
        .number()
        .integer()
        .required()
    }),
    action: api.apiController.updateChain
  },
  {
    name: 'get block number',
    path: '/chain/blocknumber',
    method: RequestMethod.GET,
    action: api.apiController.blockNumber
  },
  {
    name: 'get balance',
    path: '/chain/balance',
    method: RequestMethod.GET,
    params: Joi.object({
      address: Joi
        .string()
        .trim()
        .required(),
      token_id: Joi
        .number()
        .integer()
        .required()
    }),
    action: api.apiController.balance
  },
  {
    name: 'withdraw',
    path: '/transaction/withdraw',
    method: RequestMethod.POST,
    params: Joi.object({
      to: Joi
        .string()
        .trim()
        .required(),
      count: Joi
        .number()
        .required(),
      token_id: Joi
        .number()
        .integer()
        .required(),
      user_id: Joi
        .number()
        .integer()
        .required(),
      req_order_id: Joi
        .number()
        .integer()
        .required(),
      gas: Joi
        .number(),
      force: Joi
        .number()
        .integer()
        .valid(0, 1)
        .default(0)
    }),
    action: api.apiController.withdraw
  },
  {
    name: 'check address inside or outside',
    path: '/transaction/inside',
    method: RequestMethod.GET,
    params: Joi.object({
      address: Joi
        .string()
        .trim()
        .required(),
      chain: Joi
        .string()
        .trim()
        .pattern(/^eth$|^omni$|^btc$|^eos$/)
        .required(),
      memo: Joi
        .string()
        .trim()
    }),
    action: api.apiController.inside
  },
  {
    name: 'list order',
    path: '/order/list',
    method: RequestMethod.GET,
    params: Joi.object({
      token_id: Joi
        .number()
        .integer(),
      user_id: Joi
        .number()
        .integer(),
      type: Joi
        .number()
        .integer()
        .valid(1, 2),
      page_size: Joi
        .number()
        .integer()
        .greater(0)
        .default(20),
      page_num: Joi
        .number()
        .integer()
        .min(0)
        .default(0),
      state: Joi
        .array(),
      out_or_in: Joi
        .number()
        .integer()
        .valid(1, 2),
      flag: Joi
        .number()
        .integer()
        .default(0),
      start_time: Joi
        .number()
        .integer(),
      end_time: Joi
        .number()
        .integer()
    }),
    action: api.apiController.listOrder
  },
  {
    name: 'order detail',
    path: '/order/detail',
    method: RequestMethod.GET,
    params: Joi.object({
      order_id: Joi
        .number()
        .integer()
        .required()
    }),
    action: api.apiController.orderDetail
  },
  {
    name: 'list recover',
    path: '/recover/list',
    method: RequestMethod.GET,
    params: Joi.object({
      token_id: Joi
        .number()
        .integer(),
      user_id: Joi
        .number()
        .integer(),
      page_size: Joi
        .number()
        .integer()
        .greater(0)
        .default(20),
      page_num: Joi
        .number()
        .integer()
        .min(0)
        .default(0),
      start_time: Joi
        .number()
        .integer(),
      end_time: Joi
        .number()
        .integer()
    }),
    action: api.apiController.listRecover
  },
  {
    name: 'recover detail',
    path: '/recover/detail',
    method: RequestMethod.GET,
    params: Joi.object({
      recover_id: Joi
        .number()
        .integer()
        .required()
    }),
    action: api.apiController.recoverDetail
  },
  {
    name: 'sum',
    path: '/order/sum',
    method: RequestMethod.GET,
    params: Joi.object({
      token_id: Joi
        .number()
        .integer()
        .required(),
      type: Joi
        .number()
        .integer()
        .valid(1, 2)
        .required(),
      user_id: Joi
        .number()
        .integer(),
      start_time: Joi
        .number()
        .integer(),
      end_time: Joi
        .number()
        .integer()
    }),
    action: api.apiController.sum
  },
  {
    name: 'update order',
    path: '/order/update',
    method: RequestMethod.POST,
    params: Joi.object({
      order_ids: Joi
        .string()
        .trim()
        .required(),
      flag: Joi
        .number()
        .integer()
        .required()
    }),
    action: api.apiController.updateOrder
  },
  {
    name: 'wallet config',
    path: '/config/wallet',
    method: RequestMethod.GET,
    action: api.apiController.walletConfig
  },
  {
    name: 'update withdraw address',
    path: '/config/update/withdraw',
    method: RequestMethod.POST,
    params: Joi.object({
      chain: Joi
        .string()
        .trim()
        .pattern(/^eth$|^omni$|^btc$|^eos$/)
        .required(),
      address: Joi
        .string()
        .trim()
        .required(),
      privatekey: Joi
        .string()
        .trim()
    }),
    action: api.apiController.updateWithdrawAddress
  },
  {
    name: 'update collect address',
    path: '/config/update/collect',
    method: RequestMethod.POST,
    params: Joi.object({
        chain: Joi
          .string()
          .trim()
          .pattern(/^eth$|^omni$|^btc$|^eos$/)
          .required(),
        address: Joi
          .string()
          .trim()
          .required()
    }),
    action: api.apiController.updateCollectAddress
  },
  {
    name: 'add gas address',
    path: '/config/add/gas',
    method: RequestMethod.POST,
    params: Joi.object({
      chain: Joi
        .string()
        .trim()
        .pattern(/^eth$|^omni$|^btc$|^eos$/)
        .required(),
      address: Joi
        .string()
        .trim()
        .required(),
      privatekey: Joi
        .string()
        .trim()
    }),
    action: api.apiController.addGasAddress
  },
  {
    name: 'remove gas address',
    path: '/config/delete/gas',
    method: RequestMethod.POST,
    params: Joi.object({
      chain: Joi
        .string()
        .trim()
        .pattern(/^eth$|^omni$|^btc$|^eos$/)
        .required(),
      addresses: Joi
        .string()
        .trim()
        .required()
    }),
    action: api.apiController.removeGasAddress
  },
  {
    name: 'list callback',
    path: '/callback/list',
    method: RequestMethod.GET,
    action: api.apiController.listCallback
  },
  {
    name: 'update callback',
    path: '/callback/update',
    method: RequestMethod.POST,
    params: Joi.object({
      call_id: Joi
        .number()
        .integer()
        .required(),
      call_url_path: Joi
        .string()
        .required()
    }),
    action: api.apiController.updateCallback
  }
];

export default routes.map((item) => ({ ...item, path: `${prefix}${item.path}` }));
