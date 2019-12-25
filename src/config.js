/**
 * To hold the configuration regarding the app internal
 */
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  host: process.env.APP_HOST || "0.0.0.0",
  port: process.env.APP_PORT || 9001,
  env: "development",
  name: "api",
  postgres: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    dbname: process.env.DB_NAME || "postgres"
  }
};
