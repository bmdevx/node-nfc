function toHexString(byteArray, delimeter = ' ', breakAt = -1, toUpperCase = true, reverse = false) {
    var s = '';//'0x';

    const type = typeof byteArray;
    if (type === 'buffer') {
        byteArray = new Uint8Array(byteArray);
    }

    if (reverse) {
        for (var i = byteArray.length - 1; i > -1; i--) {
            s += ('0' + (byteArray[i] & 0xFF).toString(16)).slice(-2) + ((breakAt > 0 && (i - 1) % breakAt == 0) ? '\n' : (i > 0 ? delimeter : ''));
        }
    } else {
        for (var i = 0; i < byteArray.length; i++) {
            s += ('0' + (byteArray[i] & 0xFF).toString(16)).slice(-2) + ((breakAt > 0 && (i + 1) % breakAt == 0) ? '\n' : (i < byteArray.length - 1 ? delimeter : ''));
        }
    }


    return toUpperCase ? s.toUpperCase() : s;
}

function hasFlag(value, flag) {
    return (value & flag) === flag;
}

function isBitSet(byte, bitNum) {
    return byte & (1 << bitNum - 1)
}

function setBit(byte, bitNum) {
    return byte | (1 << bitNum - 1)
}

module.exports = {
    toHexString: toHexString,
    hasFlag: hasFlag,
    isBitSet: isBitSet,
    setBit: setBit
}