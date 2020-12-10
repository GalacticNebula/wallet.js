import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'token_status',
  indexes: [
    { name: 'token_id', fields: ['token_id'], unique: true }
  ]
})
export class TokenStatusModel extends BaseModel<TokenStatusModel> {

  @Column({
    allowNull: false
  })
  public token_id!: number;

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  public block_id!: number;

}
