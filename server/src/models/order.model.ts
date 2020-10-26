import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'order',
  indexes: [
    { name: 'txid-token_id', fields: ['txid','token_id'], unique: true },
    { name: 'uid', fields: ['user_id'] }
  ]
})
export class OrderModel extends BaseModel<OrderModel> {

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
    type: DataType.STRING(128),
    defaultValue: ''
  })
  public txid!: string;

  @Column({
    allowNull: false
  })
  public timestamp!: Date;

  @Column({
    allowNull: false,
    type: DataType.TINYINT
  })
  public out_or_in!: number;

  @Column({
    allowNull: false,
    type: DataType.TINYINT
  })
  public type!: number;

  @Column({
    allowNull: false,
    type: DataType.BIGINT
  })
  public count!: number;

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
    defaultValue: 0
  })
  public gas!: number;

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  public block_number!: number;

  @Column({
    allowNull: false,
    type: DataType.STRING(64),
    unique: true
  })
  public req_order_id!: string;

  @Column({
    allowNull: false,
    type: DataType.TINYINT
  })
  public state!: number;

  @Column({
    allowNull: false,
    type: DataType.TINYINT,
    defaultValue: 0
  })
  public flag!: number;

  @Column({
    allowNull: false,
    type: DataType.TINYINT,
    defaultValue: 0
  })
  public collect_state!: number;

}
