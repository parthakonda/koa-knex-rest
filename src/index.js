/**
 * Common controller for rest based API's
 */
const { knex } = require(".");
const validator = require("./schema.validator");

class RestController {
  constructor(config) {
    this.tableName = config.tableName;
    this.schema = config.schema;
    this.lookupID = config.lookupID;
    this.lookupIDType = config.lookupIDType || "integer";
    this.skipDefaultValidation = config.skipDefaultValidation;
    this.searchable = config.searchable;
    this.autoAudit = config.autoAudit;
    this.orderBy = config.orderBy;
  }

  _autoAudit(payload, mode) {
    // This will save the created_date and updated_date automatically when
    // creating or updating
    if (mode === "create") {
      payload.created_date = new Date().toISOString();
    }
    payload.updated_date = new Date().toISOString();
    return payload;
  }

  async list(ctx, res) {
    // read params
    let page =
      ctx.request.query.page !== undefined ? ctx.request.query.page : 0;
    let limit =
      ctx.request.query.limit !== undefined ? ctx.request.query.limit : 2000;
    let orderBy = ctx.request.query.orderBy || this.orderBy;
    page = parseInt(page);
    limit = parseInt(limit);
    if (page !== 0) page = page - 1;
    let offset = page * limit;
    // fetch data
    try {
      let query = knex(this.tableName);

      if (orderBy !== undefined) {
        query.orderBy(orderBy, "desc");
      }

      // dynamic search with searchFields
      if (this.searchable === true) {
        let schemaName = this.schema || this.tableName;
        let schema = validator.schema(schemaName);
        if (schema !== undefined) {
          for (let field in schema) {
            if (ctx.request.query[field] !== undefined) {
              let filterValue = ctx.request.query[field];
              switch (schema[field].type) {
                case "integer":
                  filterValue = parseInt(ctx.request.query[field]);
                  break;
                case "float":
                  filterValue = parseFloat(ctx.request.query[field]);
                  break;
                case "boolean":
                  filterValue =
                    ctx.request.query[field].toLowerCase() === "true";
                  break;
                case "series":
                  query.whereRaw(
                    `${field.lookup} > NOW() - interval '${ctx.request.query[field]}'`
                  );
                  break;
                default:
                  query.where(field, filterValue);
              }
            }
          }
        }
      }
      // get total records (for a better pagination in the ui)
      let countQuery = query.clone().count();
      let response = await query.offset(offset).limit(limit);
      let countResponse = await countQuery;
      // response format hook
      if (this.formatResponse !== undefined) {
        response = this.formatResponse(response);
      }
      let pagination = {
        currentPage: page + 1,
        count: response.length < limit ? response.length : limit,
        totalCount: countResponse[0].count
      };
      // return response
      return ctx.res.ok(response, null, pagination); // exit
    } catch (err) {
      return ctx.res.badRequest(400, err.message, null); // exit
    }
  }

  async create(ctx, res) {
    // Payload
    let payload = ctx.request.body || {};

    // this.autoAudit
    if (this.autoAudit === true) {
      payload = this._autoAudit(payload, "create");
    }

    // preSave hook
    if (this.preSave !== undefined) {
      payload = this.preSave(payload, "create");
    }

    // default validation
    if (
      this.skipDefaultValidation === undefined ||
      this.skipDefaultValidation === false
    ) {
      let schema = this.schema || this.tableName;
      let validation = validator.insert(ctx, schema, payload);
      if (validation.errors.length > 0) {
        return ctx.res.error(400, null, validation.errors);
      }
    }

    // validation hook
    let customValidator = {
      valid: true,
      message: null
    };

    if (this.validate !== undefined) {
      // NOTE: validate should return
      // {
      //  valid: true | false,
      //  message: ''
      // }
      customValidator = this.validate(payload, "create");
    }
    if (customValidator.valid !== true) {
      return ctx.res.error(400, customValidator.message, null);
    }
    let response;
    try {
      // Insert data
      response = await knex(this.tableName)
        .insert([payload])
        .returning("*");
    } catch (err) {
      return ctx.res.badRequest(400, err.message, null);
    }

    // postSave hook
    if (this.postSave !== undefined) {
      response = this.postSave(response, "create");
    }
    // Response
    return ctx.res.created(response);
  }

  async retrieve(ctx, res) {
    let response;
    try {
      response = await knex(this.tableName).where(this.lookupID, ctx.params.id);
    } catch (err) {
      return ctx.res.badRequest(400, err.message, null);
    }
    if (response.length === 0) {
      return ctx.res.notFound(404);
    }
    return ctx.res.ok(response[0]);
  }

  async update(ctx, res) {
    // Payload
    let payload = ctx.request.body || {};

    // this.autoAudit
    if (this.autoAudit === true) {
      payload = this._autoAudit(payload, "create");
    }

    // preSave hook
    if (this.preSave !== undefined) {
      payload = this.preSave(payload, "update");
    }

    // default validation
    if (
      this.skipDefaultValidation === undefined ||
      this.skipDefaultValidation === false
    ) {
      // Sometimes <id> can be integer and sometimes it is uuid
      // So added capability to parse as Int if it is integer
      let lookupIDType = this.lookupIDType || "integer";
      switch (lookupIDType) {
        case "integer":
          payload[this.lookupID] = parseInt(ctx.params.id);
          break;
        default:
          payload[this.lookupID] = ctx.params.id;
      }
      let schema = this.schema || this.tableName;
      let validation = validator.requireId(ctx, schema, payload);
      if (validation.errors.length > 0) {
        return ctx.res.error(400, null, validation.errors);
      }
    }

    // validation hook
    let customValidator = {
      valid: true,
      message: null
    };
    if (this.validate !== undefined) {
      // NOTE: validate should return
      // {
      //  valid: true | false,
      //  message: ''
      // }
      customValidator = this.validate(payload, "update");
    }
    if (customValidator.valid !== true) {
      return ctx.res.error(400, customValidator.message, null);
    }

    // delete id if exists from the payload
    try {
      delete payload[this.lookupID];
    } catch (err) {}

    let response;
    try {
      // update the payload
      response = await knex(this.tableName)
        .where(this.lookupID, ctx.params.id)
        .update(payload)
        .returning("*");
      if (response.length === 0) {
        return ctx.res.notFound(404);
      }
    } catch (err) {
      return ctx.res.badRequest(400, err.message, null);
    }

    // postSave hook
    if (this.postSave !== undefined) {
      response = this.postSave(response, "update");
    }

    // Response
    return ctx.res.ok(response);
  }

  async destroy(ctx, res) {
    try {
      let response = await knex(this.tableName)
        .where(this.lookupID, ctx.params.id)
        .delete();
      if (response === 0) {
        return ctx.res.notFound(404);
      }
      return ctx.res.ok(
        `${this.tableName} with id ${ctx.params.id} was not found in the DB! Please enter a valid ID and try again.`
      );
    } catch (err) {
      ctx.res.notFound(404, err.message);
    }
  }
}

module.exports = RestController;
