"use strict";
let Validator = require("jsonschema").Validator;
let fs = require("fs-extra");
let insertValid = new Validator();
let requireIdValid = new Validator();

let insertApiDef = fs.readJsonSync("src/config/spec/oapi3spec.json");
let requireIdApiDef = fs.readJsonSync("src/config/spec/oapi3spec.json");
let keys = Object.keys(insertApiDef.components.schemas);

for (let i = 0; i < keys.length; i++) {
  insertApiDef.components.schemas[keys[i]].id =
    "#/components/schemas/" + keys[i];
  insertValid.addSchema(insertApiDef.components.schemas[keys[i]]);
}

for (let i = 0; i < keys.length; i++) {
  requireIdApiDef.components.schemas[keys[i]].id =
    "#/components/schemas/" + keys[i];
  requireIdApiDef.components.schemas[keys[i]].required = ["id"];

  if (
    requireIdApiDef.components.schemas[keys[i]].properties !== undefined &&
    requireIdApiDef.components.schemas[keys[i]].properties.id !== undefined
  ) {
  }
  requireIdValid.addSchema(requireIdApiDef.components.schemas[keys[i]]);
}

const insertValidate = (ctx, currentType, optionalOverrideObject) => {
  let obj = optionalOverrideObject || ctx.request.body;
  let currentSchema = insertApiDef.components.schemas[currentType];
  currentSchema.additionalProperties = false; // this will not allow the unknown parameters to be added
  return insertValid.validate(obj, currentSchema);
};

const requireIdValidate = (ctx, currentType, optionalOverrideObject) => {
  let obj = optionalOverrideObject || ctx.request.body;
  let currentSchema = requireIdApiDef.components.schemas[currentType];
  currentSchema.additionalProperties = false; // this will not allow the unknown parameters to be added
  return requireIdValid.validate(obj, currentSchema);
};

const getSchema = schema => {
  return insertApiDef.components.schemas[schema].properties;
};

module.exports.insert = insertValidate;
module.exports.requireId = requireIdValidate;
module.exports.schema = getSchema;
