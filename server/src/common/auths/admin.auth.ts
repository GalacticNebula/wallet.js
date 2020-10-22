import { get } from 'lodash';
import { Next, Middleware } from 'koa';
import { is_testMode } from '@common/utils';
import { Code } from '@common/enums';

interface Opts {
  roles?: number[];
  power?: number;
}

export function adminAuth(opts?: Opts): Middleware {
  // @types/koa-session, 导致type不兼容，暂时定义ctx为any
  const { roles, power } = opts || {};
  return async (ctx: any, next: Next) => {
    const admin = get(ctx, 'session.admin');
    if (!admin) {
      ctx.status = 200;
      ctx.body = {
        success: false,
        error: { code: Code.UNAUTHORIZATION, message: '账号未登录' },
      };
      return;
    }

    if (!is_testMode() && !admin.allowIps.includes(ctx.realIp)) {
      ctx.status = 200;
      ctx.body = {
        success: false,
        error: { code: Code.UNAUTHORIZATION, message: 'IP未授权' },
      };
      return;
    }


    if ((roles && !roles.includes(admin.role)) ||
       (power != null && (power != (admin.power & power)))
    ) {
      ctx.status = 200;
      ctx.body = {
        success: false,
        error: { code: Code.FORBIDDEN, message: '权限不够，无法操作' },
      };
      return;
    }

    ctx.admin = ctx.user = admin;
    ctx.uid = ctx.user.id;
    await next();
  };
}
