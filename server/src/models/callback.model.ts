import { Table, Column, DataType } from 'sequelize-typescript';
import BaseModel from './base';

@Table({
  tableName: 'callback'
})
export class CallbackModel extends BaseModel<CallbackModel> {

  @Column({
    allowNull: false
  })
  public call_url_path!: string;
  
  @Column({
    allowNull: false
  })
  public desc!: string;
}
