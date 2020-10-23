import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'token'
})
export class TokenModel extends BaseModel<TokenModel> {

  @Column({
    allowNull: false,
    type: DataType.STRING(32)
  })
  public symbol!: string;

  @Column({
    allowNull: false
  })
  public address!: string;

  @Column({
    allowNull: false,
    type: DataType.STRING(32)
  })
  public name!: string;

  @Column({
    allowNull: false,
    type: DataType.TINYINT
  })
  public decimals!: number;

  @Column({
    allowNull: false,
    type: DataType.STRING(32)
  })
  public chain!: string;

  @Column({
    allowNull: false,
    type: DataType.TINYINT
  })
  public state!: number;

  @Column({
    allowNull: false,
    type: DataType.BIGINT
  })
  public limit_num!: number;

}
