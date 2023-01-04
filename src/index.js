const utils = require('./utils');

Buffer.prototype.toHexString = function (delimeter = ' ', toUpperCase = true, breakAt = -1) {
    return utils.toHexString(this, delimeter, toUpperCase, breakAt)
}


module.exports = {
    NfcDevices: require('./NfcDevices'),
    ApduCommand: require('./ApduCommand'),
    cards: require('./cards/cards'),
    ndef: require('./ndef/ndef'),
    readers: require('./readers/readers')
}