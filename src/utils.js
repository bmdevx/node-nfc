function toHexString(byteArray, delimeter = ' ', toUpperCase = true, breakAt = -1) {
    var s = '';//'0x';

    const type = typeof byteArray;
    if (type === 'buffer') {
        byteArray = new Uint8Array(byteArray);
    }

    for (var i = 0; i < byteArray.length; i++) {
        s += (
            '0' + (byteArray[i] & 0xFF).toString(16)).slice(-2) + ((breakAt > 0 && (i + 1) % breakAt == 0) ? '\n' : (i < byteArray.length - 1 ? delimeter : ''));
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