import Joi from '@hapi/joi';
import { Route } from '@common/interfaces';
import { RequestMethod } from '@common/enums';
import fieldReg from '@common/field_reg';

const prefix = '/api';

const routes: Route[] = [
  
];

export default routes.map((item) => ({ ...item, path: `${prefix}${item.path}` }));
