
import _ from 'lodash';

class Environment {

  public get(name: string, _default: string = '') {
    return _.get(process.env, name, _default);
  }

  public getNumber(name: string, _default: number = 0) {
    const n = this.get(name);
    const num = !_.isEmpty(n) ? _.toNumber(n) : undefined;
    const ret = _.defaultTo(num, _default);
    return ret;
  }

  public get development() {
    return this.get('NODE_ENV', 'development') == 'development';
  }

  public get production() {
    return this.get('NODE_ENV', 'development') == 'production';
  }

  public get debug() {
    return this.development;
  }
}

export const env = new Environment();
