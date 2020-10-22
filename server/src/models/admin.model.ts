import { Table, Column, DataType, HasMany, HasOne } from 'sequelize-typescript';

import BaseModel from './base';
import { AdminAllowIpModel } from './admin_allow_ip.model';
import { AdminSessionModel } from './admin_session.model';

@Table({
  tableName: 'admin',
  indexes: [
    { unique: true, fields: ['username'] }
  ]
})
export class AdminModel extends BaseModel<AdminModel> {

  @Column({
    allowNull: false,
    type: DataType.STRING(64)
  })
  public username!: string;

  @Column({
    allowNull: false,
    type: DataType.TINYINT,
    defaultValue: 0
  })
  public role!: number;

  @Column({
    allowNull: false,
    defaultValue: 0
  })
  public power!: number;

  @Column({
    allowNull: false,
    type: DataType.STRING(64)
  })
  public password!: string;

  @Column({
    allowNull: false,
    type: DataType.STRING(64),
    defaultValue: ''
  })
  public secret!: string;

  @Column({
    allowNull: false,
    type: DataType.TINYINT,
    defaultValue: 0
  })
  public retries!: number;

  @Column
  public last_login!: Date;

  @Column({
    type: DataType.STRING(32)
  })
  public login_ip!: string;

  @Column({
    allowNull: false,
    defaultValue: false
  })
  public locked!: boolean;

  @HasMany(() => AdminAllowIpModel, { constraints: false })
  public allowIps!: AdminAllowIpModel[];

  @HasMany(() => AdminSessionModel, { constraints: false })
  public session!: AdminSessionModel[];
}
