import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

const env = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.${env}.env` });

const rootDir = __dirname;

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.MYSQL_URL,
  port: parseInt(process.env.MYSQL_PORT),
  username: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  entities: [resolve(rootDir, '**/*.entity{.ts,.js}')],
  migrations: [resolve(rootDir, 'migrations/*{.ts,.js}')],
  synchronize: false,
  logging: ['query', 'schema', 'migration'],
});
