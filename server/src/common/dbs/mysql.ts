import { Sequelize } from 'sequelize-typescript';
import path from 'path';
import { NODE_ENV } from '@config/env';

const DB_HOST = process.env.MYSQL_HOST || 'db';
const DB_PORT = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
const DB_USERNAME = process.env.MYSQL_USERNAME || 'root';
const DB_PASSWORD = process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.MYSQL_DATABASE || 'ant';

const mysql = new Sequelize({
  dialect: 'mysql',
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  username: DB_USERNAME,
  password: DB_PASSWORD,

  models: [path.join(__dirname, '../../models/**/*.model.js')],
  modelMatch: (filename, member) => {
    const name = filename.replace('.model', '_model');
    const model = member
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .substring(1);
    return name === model;
  },

  define: {
    timestamps: true,
    paranoid: false,
    underscored: true,
    //initialAutoIncrement: '10000',
    charset: 'utf8'
  },

  pool: {
    max: 15,
    min: 2,
    acquire: 60000,
    idle: 60000,
  },

  dialectOptions: {
    decimalNumbers: true,
    maxPreparedStatements: 100,
    connectTimeout: 60000
  },

  timezone: '+08:00',
  repositoryMode: true,
  logging: NODE_ENV === 'development' ? console.log : false,
});

export default mysql;
