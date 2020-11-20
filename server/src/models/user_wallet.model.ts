import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'user_wallet',
  indexes: [
    { name: 'uid', fields: ['user_id'], unique: true }
  ]
})
export class UserWalletModel extends BaseModel<UserWalletModel> {

  @Column({
    allowNull: false
  })
  public user_id!: number;

  @Column({
    type: DataType.STRING(64)
  })
  public eth!: string;

  @Column({
    type: DataType.STRING(64)
  })
  public btc!: string;

  @Column({
    type: DataType.STRING(64)
  })
  public omni!: string;

  @Column({
    type: DataType.STRING(64)
  })
  public eos!: string;

  @Column({
    type: DataType.STRING(64)
  })
  public tron!: string;

}
