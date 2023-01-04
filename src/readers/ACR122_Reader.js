const ACR_Reader = require('./ACR_Reader');

class ACR122_Reader extends ACR_Reader {
    constructor(reader) {
        super(reader);
    }
}

module.exports = ACR122_Reader;