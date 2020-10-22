import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'config',
  indexes: [
    { unique: true, fields: ['name'] }
  ]
})
export class ConfigModel extends BaseModel<ConfigModel> {

  @Column({
    type: DataType.STRING(64)
  })
  public name!: string;

  @Column
  public value!: string;

  @Column({
    type: DataType.STRING(64)
  })
  public desc!: string;

}
