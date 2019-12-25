const RestController = require(".");

class YourController extends RestController {
  constructor() {
    super({
      tableName: "action", // Name of the table that you want to perform CRUD
      schema: "action", // OpenAPI spec schema component name
      lookupID: "id", // Mostly the primary key (on which field you want to perform lookup)
      lookupIDType: "integer", // supports integer & string (if integer pk will be parsed to integer)
      skipDefaultValidation: false, // if `false` then will validate against openapi spec if `true` then will skip the validation
      searchable: true, // if `true` then all fields can be searchable via query parameters ex: ?field=value&field2=value2 (this will perform AND operation)
      autoAudit: false, // if `true` then created_date on create and updated_date on update will be automatically get saved
      orderBy: "id" // default orderBy field
    });
  }

  // this will get invoked when `list` operation is being perormed
  // use case: when you want to update the response before sending
  // it to the client then you can use this method
  formatResponse(response) {
    /**
     * response = {
     *  message: '',
     *  status:'',
     *  data: [],
     *  pagination: {}
     * }
     */
    // update the response object according to the needs
    // You should return updated response here
    // Ex: response.newAttribute = value
    return response;
  }

  // this is used to perform the custom validation before saving or updating the
  // record and should return the json {valid: true | false, message: ''}
  // if `valid` is true then ne
  validate(payload, mode) {
    /**
     * payload - input payload after default validation
     * mode - create | update
     */

    // do some validation with the given payload

    return {
      valid: true,
      message: null
    };
  }

  // this is used to update the payload
  // before saving the record
  preSave(payload, mode) {
    /**
     * payload - input payload after default validation
     * mode - create | update
     */
    // do some updates to the payload
    // payload.newAttribute = value
    return payload;
  }

  // this is used to do some post actions after saving
  // For example you want to email some information once saved
  // then this will be useful
  postSave(response, mode) {
    /**
     * response - saved record after insertion
     * mode - create | update
     */
    // do some updates to the payload
    // payload.newAttribute = value
    return response;
  }
}

module.exports = {
  YourController: new YourController()
};
