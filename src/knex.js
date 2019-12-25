const config = require("./config");

var knex = require("knex")({
  client: "pg",
  connection: `postgres://${config.postgres.username}:${config.postgres.password}@${config.postgres.host}:${config.postgres.port}/${config.postgres.dbname}`,
  searchPath: ["knex", "public"]
});

module.exports = {
  knex
};
