const utils = require('./utils');

Buffer.prototype.toHexString = function (delimeter = ' ', breakAt = -1, toUpperCase = true, reverse = false) {
    return utils.toHexString(this, delimeter, breakAt, toUpperCase, reverse)
}


module.exports = {
    NfcDevices: require('./NfcDevices'),
    ApduCommand: require('./ApduCommand'),
    cards: require('./cards/cards'),
    ndef: require('./ndef/ndef'),
    readers: require('./readers/readers')
}