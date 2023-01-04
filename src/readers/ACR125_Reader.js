const ACR_Reader = require('./ACR_Reader');

class ACR125_Reader extends ACR_Reader {
    constructor(reader) {
        super(reader);
    }
}

module.exports = ACR125_Reader;