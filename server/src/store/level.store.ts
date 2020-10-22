import * as _ from 'lodash';
import BaseStore from './base.store';
import { levelRepository } from '@models/index';

class LevelStore extends BaseStore {

  public findByLevel(level: number) {
    return levelRepository.findOne({
      where: { level }
    });
  }

  public list() {
    return levelRepository.findAll();
  }

  public async update(level: number, params: any) {
    const { rate_0, rate_1, rate_2 } = params;
    const data: any = {};
    if (!_.isNil(rate_0)) _.assign(data, { rate_0 });
    if (!_.isNil(rate_1)) _.assign(data, { rate_1 });
    if (!_.isNil(rate_2)) _.assign(data, { rate_2 });

    const [ rows ] = await levelRepository.update(data, {
      where: { level }
    });
  }

}

export const levelStore = new LevelStore();
