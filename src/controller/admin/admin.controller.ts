import _ from 'lodash';
import { Context } from 'koa';
import BaseController from '../base.controller';
import { adminService } from '@service/index';

class AdminController extends BaseController {

  public listAdmin(ctx: Context) {
    return adminService.listAdmin(ctx.params);
  }

  public addAdmin(ctx: Context) {
    return adminService.addAdmin(ctx.uid, ctx.params);
  }

  public removeAdmin(ctx: Context) {
    return adminService.removeAdmin(ctx.uid, ctx.params);
  }

  public updateAdmin(ctx: Context) {
    return adminService.updateAdmin(ctx.user, ctx.params);
  }

  public updatePower(ctx: Context) {
    return adminService.updatePower(ctx.uid, ctx.params);
  }

  public listAdminLog(ctx: Context) {
    return adminService.listAdminLog(ctx.params);
  }

  public setWebsite(ctx: Context) {
    return adminService.setWebsite(ctx.uid, ctx.params)
  }

  public addWebSiteConfig(ctx: Context) {
    return adminService.addWebSiteConfig(ctx.uid, ctx.params);
  }

  public updateWebSiteConfig(ctx: Context) {
    return adminService.updateWebSiteConfig(ctx.uid, ctx.params);
  }

  public getWebsiteConfigList(ctx: Context) {
    return adminService.getWebsiteConfigList();
  }

  public getWebsite(ctx: Context) {
    return adminService.getWebsite();
  }

  public listAdminIp(ctx: Context) {
    return adminService.listAdminIp(ctx.params);
  }

  public addAdminIp(ctx: Context) {
    return adminService.addAdminIp(ctx.uid, ctx.params);
  }
  
  public delAdminIp(ctx: Context) {
    return adminService.delAdminIp(ctx.uid, ctx.params);
  }

}

export const adminController = new AdminController();
