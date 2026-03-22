const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'mytax_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: 'knex_migrations',
      directory: path.join(__dirname, '../../migrations'),
    },
    seeds: {
      directory: path.join(__dirname, '../../seeds'),
    },
  },
  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_TEST_NAME || 'mytax_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      tableName: 'knex_migrations',
      directory: require('path').join(__dirname, '../../migrations'),
    },
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: { min: 2, max: 20 },
    migrations: {
      tableName: 'knex_migrations',
      directory: require('path').join(__dirname, '../../migrations'),
    },
  },
};
