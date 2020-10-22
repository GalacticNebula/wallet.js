import _ from 'lodash';
import { UniqueConstraintError } from 'sequelize';
import BaseService from './base.service';
import { QRCODE_PAYS } from '@common/constants';
import { CardType, Code } from '@common/enums';
import { Exception, Assert } from '@common/exceptions';
import { UserModel } from '@models/user.model';
import { cardStore } from '@store/index';

class CardService extends BaseService {

  public async add(u: UserModel, params: any) {
    const uid = _.get(u, 'id');
    const { type, bank, branch, name, cardno, qrcode } = params;

    if (type != CardType.BANK) {
      Assert(name != null, Code.BAD_PARAMS, '参数错误, name不能为空');
      Assert(cardno != null, Code.BAD_PARAMS, '参数错误, cardno不能为空');
    } else {
      Assert(bank != null, Code.BAD_PARAMS, '参数错误, bank不能为空');
      Assert(branch != null, Code.BAD_PARAMS, '参数错误, branch不能为空');
      Assert(name != null, Code.BAD_PARAMS, '参数错误, name不能为空');
      Assert(cardno != null, Code.BAD_PARAMS, '参数错误, cardno不能为空');
    }

    try {
      const card = await cardStore.create({
        uid,
        type,
        bank,
        branch,
        name,
        cardno,
        qrcode
      });

      return card.serializer();
    } catch (e) {
      if (e instanceof UniqueConstraintError)
        throw new Exception(Code.SERVER_ERROR, '卡号已存在');

      throw e;
    }
  }

  public async list(uid: number, params: any) {
    const { type } = params;
    const where: any = { uid };
    if (!_.isNil(type))
      _.assign(where, { type });

    const cards = await cardStore.findAll({ where });
    return cards.map(v => v.serializer());
  }

  public remove(uid: number, params: any) {
    const { id } = params;
    return cardStore.remove(uid, id);
  }

  public async toggleEnabled(uid: number, params: any) {
    const { id, enabled } = params;
    const card = await cardStore.findById(id);
    if (!card) throw new Exception(Code.BAD_PARAMS, '卡不存在');

    const { type } = card;
    if (type != CardType.BANK || 0 == enabled)
      await cardStore.toggleEnabled(uid, id, !!enabled);
    else
      await cardStore.choose(uid, id);
  }

}

export const cardService = new CardService();
