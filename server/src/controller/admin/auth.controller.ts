import _ from 'lodash';
import { Context } from 'koa';
import BaseController from '../base.controller';
import { adminService, authService } from '@service/index';

class AuthController extends BaseController {

  public async login(ctx: Context) {
    const admin = await adminService.login(ctx.params, ctx.realIp);
    if (ctx.session)
      ctx.session.admin = admin;

    return admin;
  }

  public async logout(ctx: Context) {
    await adminService.logout(ctx.uid, ctx.realIp);
    ctx.session = null;
  }

  public getCaptcha(ctx: Context) {
    return authService.getCaptcha();
  }

}

export const authController = new AuthController();
