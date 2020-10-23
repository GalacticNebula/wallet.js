import mysql from '@common/dbs/mysql';

import { AdminModel } from './admin.model';
import { AdminSessionModel } from './admin_session.model';
import { AdminAllowIpModel } from './admin_allow_ip.model';
import { UserWalletModel } from './user_wallet.model';
import { OrderModel } from './order.model';
import { ConfigModel } from './config.model';
import { AdminLogModel } from './admin_log.model';
import { AddressModel } from './address.model';
import { CallbackModel } from './callback.model';
import { ChainModel } from './chain.model';
import { RecoverModel } from './recover.model';
import { TokenModel } from './token.model';
import { TokenStatusModel } from './token_status.model';

export const adminRepository = mysql.getRepository(AdminModel);
export const adminSessionRepository = mysql.getRepository(AdminSessionModel);
export const adminAllowIpRepository = mysql.getRepository(AdminAllowIpModel);
export const userWalletRepository = mysql.getRepository(UserWalletModel);
export const orderRepository = mysql.getRepository(OrderModel);
export const configRepository = mysql.getRepository(ConfigModel);
export const adminLogRepository = mysql.getRepository(AdminLogModel);
export const addressRepository = mysql.getRepository(AddressModel);
export const callbackRepository = mysql.getRepository(CallbackModel);
export const chainRepository = mysql.getRepository(ChainModel);
export const recoverRepository = mysql.getRepository(RecoverModel);
export const tokenRepository = mysql.getRepository(TokenModel);
export const tokenStatusRepository = mysql.getRepository(TokenStatusModel);