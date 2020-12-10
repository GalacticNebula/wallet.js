import Joi from 'joi';
import { Route } from '@common/interfaces';
import { RequestMethod } from '@common/enums';
import fieldReg from '@common/field_reg';
import { admin } from '@controller/admin';
import { adminAuth } from '@common/auths';

const prefix = '/admin';

const routes: Route[] = [
  {
    name: 'login',
    path: '/login',
    method: RequestMethod.POST,
    params: Joi.object({
      username: Joi.string().trim().required(),
      password: Joi.string()
        .trim()
        .pattern(fieldReg.password.reg())
        .required()
        .error(new Error(fieldReg.password.message())),
      captcha: Joi
        .string()
        .trim()
        .required()
        .pattern(fieldReg.captcha.reg({ len: 4 }))
        .error(new Error('请输入图形验证码.')),
      captchaKey: Joi
        .string()
        .trim()
        .required()
        .error(new Error('请输入图形验证码Key'))
    }),
    action: admin.authController.login
  },
/*
  {
    name: 'get captcha',
    path: '/captcha',
    method: RequestMethod.GET,
    action: admin.authController.getCaptcha
  },
*/
  {
    name: 'logout',
    path: '/logout',
    method: RequestMethod.POST,
    middlewares: [ adminAuth() ],
    action: admin.authController.logout
  },
  {
    name: 'list admin',
    path: '/admin',
    method: RequestMethod.GET,
    middlewares: [ adminAuth() ],
    params: Joi.object({
      username: Joi
        .string()
        .trim(),
      page: Joi
        .number()
        .integer()
        .default(0),
      pageSize: Joi
        .number()
        .integer()
        .default(10)
    }),
    action: admin.adminController.listAdmin
  },
  {
    name: 'add admin',
    path: '/admin',
    method: RequestMethod.POST,
    middlewares: [ adminAuth() ],
    params: Joi.object({
      username: Joi
        .string()
        .trim()
        .required(),
      password: Joi
        .string()
        .trim()
        .pattern(fieldReg.password.reg())
        .required()
    }),
    action: admin.adminController.addAdmin
  },
  {
    name: 'remove admin',
    path: '/admin/:id',
    method: RequestMethod.DEL,
    middlewares: [ adminAuth() ],
    action: admin.adminController.removeAdmin
  },
  {
    name: 'update admin',
    path: '/admin',
    method: RequestMethod.PUT,
    middlewares: [ adminAuth() ],
    params: Joi.object({
      id: Joi
        .number()
        .integer()
        .required(),
      password: Joi
        .string()
        .trim()
        .pattern(fieldReg.password.reg()),
      locked: Joi
        .bool()
    }),
    action: admin.adminController.updateAdmin
  },
  {
    name: 'update admin power',
    path: '/admin/power',
    method: RequestMethod.POST,
    middlewares: [ adminAuth() ],
    params: Joi.object({
      id: Joi
        .number()
        .integer()
        .required(),
      power: Joi
        .number()
        .integer()
        .required()
    }),
    action: admin.adminController.updatePower
  },
  {
    name: 'list admin log',
    path: '/admin/log',
    method: RequestMethod.GET,
    middlewares: [ adminAuth() ],
    params: Joi.object({
      admin_id: Joi
        .number()
        .integer(),
      type: Joi
        .number()
        .integer(),
      page: Joi
        .number()
        .integer()
        .default(0),
      pageSize: Joi
        .number()
        .integer()
        .default(10)
    }),
    action: admin.adminController.listAdminLog
  },
  {
    name: 'set config',
    path: '/config',
    method: RequestMethod.POST,
    middlewares: [ adminAuth() ],
    params: Joi.object({
      web_status: Joi
          .number()
          .integer()
          .valid(0, 1),
      sms_enable: Joi
        .number()
        .integer()
        .valid(0, 1),
      register: Joi
        .number()
        .integer()
        .valid(0, 1),
      match_min: Joi
        .number()
        .integer(),
      withdraw_rate: Joi
        .number()
    }),
    action: admin.adminController.setWebsite
  },
  {
    name: 'add config',
    path: '/config/add',
    method: RequestMethod.POST,
    middlewares: [adminAuth()],
    params: Joi.object({
      name: Joi
        .string()
        .trim()
        .required(),
      value: Joi
        .string()
        .trim()
        .required()
    }),
    action: admin.adminController.addWebSiteConfig
  },
  {
    name: 'update config',
    path: '/config',
    method: RequestMethod.PUT,
    middlewares: [adminAuth()],
    params: Joi.object({
      id: Joi
        .number()
        .integer()
        .required(),
      name: Joi
        .string(),
      value: Joi
        .string()
    }),
    action: admin.adminController.updateWebSiteConfig
  },
  {
    name: 'get config',
    path: '/config',
    method: RequestMethod.GET,
    middlewares: [adminAuth()],
    action: admin.adminController.getWebsiteConfigList
  },
  {
    name: 'get config object',
    path: '/config/ob',
    method: RequestMethod.GET,
    middlewares: [adminAuth()],
    action: admin.adminController.getWebsite
  },
  {
    name: 'list admin ip',
    path: '/ip',
    method: RequestMethod.GET,
    middlewares: [adminAuth()],
    params: Joi.object({
      admin_id: Joi
        .number()
        .integer(),
      page: Joi
        .number()
        .integer()
        .default(0),
      pageSize: Joi
        .number()
        .integer()
        .default(10)
    }),
    action: admin.adminController.listAdminIp
  },
  {
    name: 'add admin ip',
    path: '/ip',
    method: RequestMethod.POST,
    middlewares: [adminAuth()],
    params: Joi.object({
      admin_id: Joi
        .number()
        .integer(),
      ip: Joi
        .string()
        .trim()
    }),
    action: admin.adminController.addAdminIp
  },
  {
    name: 'remove admin ip',
    path: '/ip/:id',
    method: RequestMethod.DEL,
    middlewares: [adminAuth()],
    action: admin.adminController.delAdminIp
  }
];

export default routes.map((item) => ({ ...item, path: `${prefix}${item.path}` }));
