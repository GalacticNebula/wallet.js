import _ from 'lodash';

export class Schedule {
  protected lock: boolean = false;

  constructor(public cron: string) {}

  public get valid() {
    return _.has(process.env, this.cron);
  }

  public async run() {}
}
