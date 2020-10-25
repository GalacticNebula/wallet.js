import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'recover',
  indexes: [
    { name: 'order_id', fields: ['order_id'], unique: true },
    { name: 'uid', fields: ['user_id'] }
  ]
})
export class RecoverModel extends BaseModel<RecoverModel> {

  @Column({
    allowNull: false
  })
  public user_id!: number;

  @Column({
    allowNull: false
  })
  public token_id!: number;

  @Column({
    allowNull: false
  })
  public order_id!: number;

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
  public from_address!: string;

  @Column({
    allowNull: false,
    type: DataType.STRING(128),
    defaultValue: ''
  })
  public to_address!: string;

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
