'use strict';
const path = require('path');
const root = process.cwd();

module.exports = {
  // secret data can be moved to env variables
  // or a separate config
  secretKey: 'super creazy secret key',
  root: root,
  server: {
    port: 7000
  },
  env: 'development',
  corsOrigin: 'http://localhost:8080',
  db: {
    URL: 'http://127.0.0.1:8529',
    name: 'database_name',
    user: 'database_user',
    password: 'database_pass'
  },
  // uploadDir: '/home/tumen/vuejs/ts-vue/public/upload',
  mailer: {
    user: 'some@mail.ru',
    pass: 'password'
  }
};
