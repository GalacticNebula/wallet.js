import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'chain'
})
export class ChainModel extends BaseModel<ChainModel> {

  @Column({
    allowNull: false,
    type: DataType.STRING(32)
  })
  public chain!: string;

  @Column({
    allowNull: false
  })
  public confirmations1!: number;

  @Column({
    allowNull: false
  })
  public confirmations2!: number;

  @Column({
    allowNull: false,
    type: DataType.TINYINT
  })
  public state!: number;

  @Column({
    allowNull: false
  })
  public token_id!: number;

}
