class ApduCommand {
    constructor(obj) {
        if (Array.isArray(obj) || Buffer.isBuffer(obj)) {
            this._bytes = obj;
        }
        else if (Object.is(obj)) {
            const { cla, ins, p1, p2, data, le, bytes } = apdu;

            this._cla = cla;
            this._p1 = p1;
            this._p2 = p2;
            this._data = data;
            this._le = le;

            this._bytes = bytes || [cla, ins, p1, p2].concat(data ? [data.length].concat(data) : [], le || 0);
        } else {
            throw 'Unknown Type';
        }
    }

    bytes() { return this._bytes; }

    get Cla() { return this._bytes; }
    get P1() { return this._p1; }
    get P2() { return this._p2; }
    get Data() { return this._data; }
    get Length() { return this._le; }
}

module.exports = ApduCommand;