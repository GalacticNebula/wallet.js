import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'fee',
  indexes: [
    { name: 'uid', fields: ['user_id'] }
  ]
})
export class FeeModel extends BaseModel<FeeModel> {

  @Column({
    allowNull: false
  })
  public user_id!: number;

  @Column({
    allowNull: false
  })
  public token_id!: number;

  @Column({
    allowNull: false,
    type: DataType.BIGINT
  })
  public value!: number;

  @Column({
    allowNull: false,
    type: DataType.STRING(128),
    defaultValue: ''
  })
  public from!: string;

  @Column({
    allowNull: false,
    type: DataType.STRING(128),
    defaultValue: ''
  })
  public to!: string;

  @Column({
    allowNull: false,
    type: DataType.STRING(128),
    defaultValue: ''
  })
  public txid!: string;

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  public block_number!: number;

  @Column({
    allowNull: false,
    type: DataType.TINYINT,
    defaultValue: 0
  })
  public state!: number;

}
