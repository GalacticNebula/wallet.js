import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'address'
})
export class AddressModel extends BaseModel<AddressModel> {

  @Column({
    allowNull: false,
    type: DataType.TINYINT
  })
  public type!: number;

  @Column({
    allowNull: false,
    type: DataType.STRING(32)
  })
  public chain!: string;

  @Column({
    allowNull: false
  })
  public address!: string;

  @Column
  public private_key!: string;

}
