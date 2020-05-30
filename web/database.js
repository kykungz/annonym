const mysql = require('mysql2/promise')
const config = require('../keys/config')

class Database {
  constructor() {
    this.connection = null
  }

  async connect() {
    const pool = await mysql.createPool({
      connectionLimit: 8,
      host: config.DB_HOST,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      charset: 'utf8_unicode_ci',
    })

    this.connection = pool
  }
}

module.exports = new Database()
