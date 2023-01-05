const utils = require('../utils');
const {
    TNF_CODES,
    TNF_VALUES,
    WELL_KNOWN_TYPES,
    EXTERNAL_TYPES,
    MEDIA_TYPES,

    HEADER_FLAGS,
    URI_PREFIX_CODES,
    URI_PREFIXES,
    WIFI_FIELDS,
    WIFI_AUTH_TYPES,
    WIFI_ENCRYPTION_TYPES,
    TEXT_ENCODING_TYPE,
    BLUETOOTH_ATTR_CODES
} = require('./NDEF_CONSTS');

const MAC_REGEX = /([0-9A-F]{2}):([0-9A-F]{2}):([0-9A-F]{2}):([0-9A-F]{2}):([0-9A-F]{2}):([0-9A-F]{2})/gm
const HEX_REGEX = /[0-9A-Fa-f]{6}/g;

class NdefHeader {
    _headerByte = 0x0;

    constructor(headerByte) {
        this._headerByte = headerByte;
    }

    get IsChunked() { return utils.hasFlag(this._headerByte, HEADER_FLAGS.CHUNKED); }
    get IsShortRecord() { return utils.hasFlag(this._headerByte, HEADER_FLAGS.SHORT_RECORD); }
    get HasIDLength() { return utils.hasFlag(this._headerByte, HEADER_FLAGS.ID_LENGTH_PRESENT); }
    get TypeNameFormat() { return this._headerByte & HEADER_FLAGS.MASK_TNF; }

    get Byte() { return this._headerByte }

    static create(isChunked, isShortRecord, hasIDLength, typeNameFormat) {
        var byte = 0x00;
        if (isChunked) byte |= HEADER_FLAGS.CHUNKED;
        if (isShortRecord) byte |= HEADER_FLAGS.SHORT_RECORD;
        if (hasIDLength) byte |= HEADER_FLAGS.ID_LENGTH_PRESENT;
        byte |= typeNameFormat;

        return new NdefHeader(byte);
    }
}

class NdefRecord {
    constructor(payload, id = null, typeNameFormat = null, type = null, recordNumber = null) {
        this._payload = payload;
        this._id = id;
        this._typeNameFormat = typeNameFormat == null ? TNF_VALUES.UNKNOWN : typeNameFormat;
        this._type = type == null ? '?' : type;
        this._recNum = recordNumber;
    }

    get Payload() { return this._payload == null ? this.toBytes() : this._payload; }

    get ID() { return this._id; }

    get Type() { return this._type; }

    get TypeNameFormat() { return this._typeNameFormat; }

    get RecordNumber() { return this._recNum; }


    toString() {
        return `Record #${this.RecordNumber} [RID:${this.ID}, TNF:${TNF_VALUES[this.TypeNameFormat] != undefined ? TNF_VALUES[this.TypeNameFormat] : this.TypeNameFormat}, Type:${this.Type}]: ${new TextDecoder().decode(this.Payload)}`
    }

    toBytes() {
        return (this.Payload && this.Payload instanceof Buffer) ? this.Payload : Buffer.alloc(0);
    }
}

class TextRecord extends NdefRecord {
    constructor(text = null, language = null, encodingType = null, id = null, payload = null, recordNumber = null) {
        super(payload, id, TNF_VALUES.WELL_KNOWN, WELL_KNOWN_TYPES.TEXT, recordNumber);

        this._encodingType = encodingType;
        this._language = language;
        this._text = text;
    }

    get EncodingType() { return this._encodingType; }
    set EncodingType(encodingType) { this._encodingType = encodingType; }

    get Encoding() { return this._encodingType == TEXT_ENCODING_TYPE.UTF16 ? 'utf16' : 'utf8' }

    get Language() { return this._language; }
    set Language(lang) { this._language = lang; }

    get Text() { return this._text; }
    set Text(text) { this._text = text; }

    get Payload() { return this.toBytes(); }


    toBytes() {
        var eb = 0x0;

        //set encoding to to first byte
        if (this.EncodingType == TEXT_ENCODING_TYPE.UTF8) {
            eb &= 0x7F;
        } else {
            eb |= 0x80;
        }

        //set language code length to first byte
        eb |= (0x3f & this.Language.length);

        return Buffer.concat([Buffer.from([eb]), Buffer.from(this.Language), Buffer.from(this.Text.trim(), this.Encoding)])
    }

    static fromBytes(payload, id = null, recordNumber = null) {
        const eb = payload != null ? payload[0] : 0;

        return new TextRecord(
            payload.subarray(3).toString(this._encoding),
            payload.subarray(1, (eb & 0x0F) + 1).toString('utf8'),
            utils.hasFlag(eb, 1 << 7) ? TEXT_ENCODING_TYPE.UTF16 : TEXT_ENCODING_TYPE.UTF8,
            id,
            payload,
            recordNumber
        );
    }

    static create(text, lang = 'en', encodingType = TEXT_ENCODING_TYPE.UTF8, id = null) {
        return new TextRecord(text, lang, encodingType, id);
    }


    toString() { return `${this.Language.length > 0 ? `[${this.Language}] ` : ''}${this.Text}`; }
}

class UriRecord extends NdefRecord {
    static URI_PREFIXES = URI_PREFIXES;
    static URI_PREFIX_CODES = URI_PREFIX_CODES;

    constructor(uriId, uriContent, id = null, payload = null, recordNumber = null) {
        super(payload, id, TNF_VALUES.WELL_KNOWN, WELL_KNOWN_TYPES.URI, recordNumber);

        this._uriId = uriId;
        this._uriContent = uriContent;
    }

    get UriId() { return this._uriId; }
    set UriId(value) { this._uriId = value; }

    get UriPrefix() { return URI_PREFIXES[this._uriId] != undefined ? URI_PREFIXES[this._uriId] : ''; }

    get UriContent() { return this._uriContent; }
    set UriContent(value) { this._uriContent = value; }

    get Uri() { return this.UriPrefix + this._uriContent; }


    toBytes() {
        return Buffer.concat([Buffer.from([this.UriId]), Buffer.from(this.UriContent.trim(), 'utf8')]);
    }

    static fromBytes(payload, id = null, recordNumber = null) {
        return new UriRecord(
            payload[0],
            payload.subarray(1).toString('utf8'),
            id,
            payload,
            recordNumber
        );
    }

    static create(uriId, uriContent, id = null) {
        return new UriRecord(
            uriId,
            uriContent,
            id
        );
    }


    toString() { return this.Uri; }
}

class VCardRecord extends NdefRecord {
    constructor(tags, id = null, payload = null, recordNumber = null) {
        super(payload, id, TNF_VALUES.MEDIA, MEDIA_TYPES.VCARD, recordNumber);

        if (Array.isArray(tags)) {
            this._tags = tags;
        } else {
            this._tags = [];
            Object.keys(tags).forEach(key => {
                this._tags.push([key, tags[key]]);
            });
        }

        this._tags.forEach(([attr, value]) => {
            this[attr] = value;
        });
    }

    get Tags() { return this._tags; }

    get Payload() { return this.toBytes(); }


    addTag(attr, value) {
        this._tags.push([attr, value]);
        this[attr] = value;
    }

    removeTag(attr) {
        for (var i = this._tags.length; i >= 0; i--) {
            if (this._tags[i][0] == attr) this._tags.splice(i, 1);
        }

        delete this[attr];
    }


    toBytes() {
        const parts = ['BEGIN'];

        this.Tags.forEach(([attr, value]) => {
            parts.push(`${attr}:${value}`);
        })

        parts.push('END')

        return Buffer.from(parts.join('\n'), 'utf8');
    }

    static fromBytes(payload, id = null, recordNumber = null) {
        var tags = []

        const parts = payload.toString('utf8').split('\n');

        parts.forEach(part => {
            const partL = part.toLowerCase();
            if (partL.startsWith('begin')) {
                //
            } else if (partL.startsWith('end')) {
                return;
            } else {
                const idx = part.indexOf(':');
                const attr = part.substring(0, idx);
                const value = part.substring(idx + 1).trim();

                tags.push([attr, value]);
            }
        });

        return new VCardRecord(tags, id, payload, recordNumber);
    }

    static create(tags, id = null) {
        return new VCardRecord(tags, id);
    }


    toString() {
        var text = '- vcard -\n';
        this._tags.forEach(([attr, value]) => {
            text += `${attr}: ${value}\n`;
        });
        text += '--------'
        return text;
    }
}

class AndroidAppRecord extends NdefRecord {
    constructor(packageName, id = null, payload = null, recordNumber = null) {
        super(payload, id, TNF_VALUES.EXTERNAL, EXTERNAL_TYPES.ANDROID_APP, recordNumber);

        this._packageName = packageName;
    }

    get PackageName() { return this._packageName; }

    set PackageName(value) { this._packageName = value; }

    get Payload() { return this.toBytes(); }


    toBytes() {
        return Buffer.from(this.PackageName.trim(), 'utf8');
    }

    static fromBytes(payload, id = null, recordNumber = null) {
        return new AndroidAppRecord(payload.toString('utf8'), id, payload, recordNumber);
    }

    static create(packageName, id = null) {
        return new AndroidAppRecord(packageName, id);
    }


    toString() { return `[Android App]: ${this.PackageName}`; }
}

class BlueToothRecord extends NdefRecord {
    constructor(addressRaw, oob = [], id = null, payload = null, recordNumber = null) {
        super(payload, id, TNF_VALUES.MEDIA, MEDIA_TYPES.BLUETOOTH, recordNumber);

        this._addressRaw = addressRaw;
        this._oob = oob;
    }

    get Address() { return utils.toHexString(this._addressRaw.reverse(), ':'); }
    set Address(value) {

        if (!(value.match(MAC_REGEX) || (value.length == 12 && value.match(HEX_REGEX)))) {
            throw 'Invalid MAC Address';
        }

        this._addressRaw = Buffer.from(value.replaceAll(':', ''), 'hex').reverse();
    }

    get AddressRaw() { return this._addressRaw; }
    set AddressRaw(value) {
        if (!value instanceof Buffer) {
            throw 'Address must be in a buffer';
        }

        this._addressRaw = value;
    }

    get OOB() { return this._oob; }
    set OOB(value) {
        if (!Array.isArray(value)) {
            throw 'OOB must be an Array';
        }

        this._oob = value;
    }


    toBytes() {
        var oobData = [];

        if (this.OOB.length > 0) {
            this.OOB.forEach(oob => {
                oobData.push(Buffer.concat([
                    Buffer.from([oob.data.length, oob.Code]),
                    oob.Data
                ]))
            });
        }

        var addrRaw = Buffer.alloc(2);
        addrRaw.writeUInt16BE(this.OOB != null ? this.OOB.length : 0);

        return Buffer.concat([
            addrRaw.reverse(),
            this.AddressRaw,
            Buffer.concat(oobData)
        ])
    }

    static fromBytes(payload, id = null, recordNumber = null) {
        var btPayloadLength = Buffer.from(new Uint8Array(payload.subarray(0, 2).reverse())).readInt16BE();

        const oobs = [];

        if (btPayloadLength > 0) {
            var idx = 10, dl, code, oobPay;

            for (; idx < payload.length;) {
                dl = payload.readUInt8(idx);
                code = payload.readUInt8(idx + 1);
                oobPay = payload.subarray(idx + 2, idx + dl - 1);
                idx += (dl + 1);

                oobs.push(new BluetoothOobData(code, oobPay));
            }
        }


        return new BlueToothRecord(
            payload.subarray(2, 9),
            oobs,
            id,
            payload,
            recordNumber);
    }

    static create(addressRaw, id = null) {
        return new BlueToothRecord(addressRaw, id);
    }


    toString() { return `[Bluetooth]: ${this.Address}${this.OOB != null && this.OOB.length > 0 ? ` | OOB: ${this.OOB.map(oob => oob.toString()).join('\n')}` : ''}`; }
}

class BluetoothOobData {
    constructor(code, data) {
        this.Code = code;
        this.Data = data;
    }

    get Code() { return this._code; }
    set Code(value) {
        if (BLUETOOTH_ATTR_CODES[value] == undefined) {
            throw 'Invalid Bluetooth Attribute Code';
        }

        this._code = value;
    }

    get CodeName() { return BLUETOOTH_ATTR_CODES[this.Code] != undefined ? BLUETOOTH_ATTR_CODES[this.Code] : 'Unknown'; }

    get Data() { return this._data; }
    set Data(value) {
        if (!(value instanceof Buffer)) {
            throw 'Data must be of type Buffer'
        }

        this._data = value;
    }

    static fromBytes(payload) {
        const dl = payload.readInt8(0);
        const code = payload.readUInt8(1);
        const data = payload.subarray(2, 2 + dl);

        return new BluetoothOobData(code, data);
    }

    static toBytes() {
        return Buffer.concat([
            (this.Data && this.Data.length) > 0 ? this.Data.length + 1 : 1,
            Buffer.from([code]),
            (this.Data && this.Data.length) > 0 ? this.Data : Buffer.alloc(0)
        ]);
    }

    toString() {
        return `(${this.CodeName}) ${this.Data.toHexString()}`;
    }
}

class WiFiRecord extends NdefRecord {
    static WIFI_AUTH_TYPES = WIFI_AUTH_TYPES;
    static WIFI_ENCRYPTION_TYPES = WIFI_ENCRYPTION_TYPES;

    constructor(ssid, networkKey, authTypeCode, encTypeCode, macRaw, extended = null, id = null, payload = null, recordNumber = null) {
        super(payload, id, TNF_VALUES.MEDIA, MEDIA_TYPES.WIFI, recordNumber);

        this._ssid = ssid;
        this._networkKey = networkKey;
        this._authTypeCode = authTypeCode;
        this._encTypeCode = encTypeCode;
        this._macRaw = macRaw;

        this._extended = extended;
    }

    get SSID() { return this._ssid; }
    get NetworkKey() { return this._networkKey; }

    get AuthTypeCode() { return this._authTypeCode; }
    set AuthTypeCode(value) {
        //todo
    }

    get AuthType() {
        var authType;

        const addType = (at) => {
            if (authType) {
                authType += ` | ${at}`;
            } else {
                authType = at;
            }
        }

        if (utils.hasFlag(this._authTypeCode, WIFI_AUTH_TYPES.WPA_PSK)) {
            addType('WPA_PSK');
        }

        if (utils.hasFlag(this._authTypeCode, WIFI_AUTH_TYPES.WPA_EAP)) {
            addType('WPA_EAP');
        }

        if (utils.hasFlag(this._authTypeCode, WIFI_AUTH_TYPES.WPA2_PSK)) {
            addType('WPA2_PSK');
        }

        if (utils.hasFlag(this._authTypeCode, WIFI_AUTH_TYPES.WPA2_EAP)) {
            addType('WPA2_EAP');
        }

        if (this._authTypeCode === WIFI_AUTH_TYPES.OPEN) {
            authType = 'OPEN';
        }

        return authType;
    }

    get EncryptionTypeCode() { return this._encTypeCode; }
    set EncryptionTypeCode(value) {
        //todo
    }

    get EncryptionType() {
        var encType;

        const addType = (enc) => {
            if (encType) {
                encType += ` | ${enc}`;
            } else {
                encType = enc;
            }
        }

        if (utils.hasFlag(this._encTypeCode, WIFI_ENCRYPTION_TYPES.AES)) {
            addType('AES');
        }

        if (utils.hasFlag(this._encCodeType, WIFI_ENCRYPTION_TYPES.TKIP)) {
            addType('TKIP');
        }

        if (utils.hasFlag(this._encCodeType, WIFI_ENCRYPTION_TYPES.WEP)) {
            addType('WEP');
        }

        if (this._encCodeType == WIFI_ENCRYPTION_TYPES.NONE) {
            encType = 'NONE';
        }

        return encType;
    }

    get MAC() {
        return utils.toHexString(this._macRaw.reverse(), ':');
    }
    set MAC(value) {
        if (!(value.match(MAC_REGEX) || (value.length == 12 && value.match(HEX_REGEX)))) {
            throw 'Invalid MAC Address';
        }

        this._macRaw = Buffer.from(value.replaceAll(':', ''), 'hex').reverse();
    }


    toBytes() {
        const parts = []
        var tmpBuf;

        parts.push(Buffer.from([WIFI_FIELDS.SSID, this.SSID.length]));
        parts.push(Buffer.from(this.SSID, 'utf8'));

        parts.push(Buffer.from([WIFI_FIELDS.NETWORK_KEY, this.NetworkKey.length]));
        parts.push(Buffer.from(this.NetworkKey, 'utf8'));

        parts.push(Buffer.from([WIFI_FIELDS.AUTH_TYPE, 2]));
        tmpBuf = Buffer.alloc(2);
        tmpBuf.writeUint16BE(this.AuthTypeCode);
        parts.push(tmpBuf);

        parts.push(Buffer.from([WIFI_FIELDS.NETWORK_INDEX, 1]));
        parts.push(Buffer.from([1]));

        parts.push(Buffer.from([WIFI_FIELDS.ENCRYPTION_TYPE, 2]));
        tmpBuf = Buffer.alloc(2)
        tmpBuf.writeUint16BE(this.EncryptionTypeCode);
        parts.push(tmpBuf);

        parts.push(Buffer.from([WIFI_FIELDS.MAC_ADDRESS, this._macRaw.length]));
        tmpBuf = Buffer.alloc(2)
        tmpBuf.writeUint16BE(this._macRaw);
        parts.push(tmpBuf);

        //todo extended

        return Buffer.concat(parts);
    }

    static fromBytes(payload, id = null, recordNumber = null) {
        const ID_AND_SIZE_SIZE = 4;

        var ssid, networkKey, authTypeCode, encTypeCode, macRaw;

        var fieldId = payload.readUint16BE(0);
        var fieldSize = payload.readUint16BE(2);
        const endIdx = fieldSize + ID_AND_SIZE_SIZE;

        var pos = ID_AND_SIZE_SIZE;

        const getTextField = (idx, size) => {
            return payload.subarray(idx, idx + size).toString('utf8');
        }

        while (pos < endIdx) {
            fieldId = payload.readUint16BE(pos);
            fieldSize = payload.readUint16BE(pos + 2);

            pos += ID_AND_SIZE_SIZE;

            switch (fieldId) {
                case WIFI_FIELDS.SSID: {
                    ssid = getTextField(pos, fieldSize);
                    break;
                }
                case WIFI_FIELDS.NETWORK_KEY: {
                    networkKey = getTextField(pos, fieldSize);
                    break;
                }
                case WIFI_FIELDS.AUTH_TYPE: {
                    authTypeCode = payload.readUint16BE(pos);
                    break;
                }
                case WIFI_FIELDS.NETWORK_INDEX: {
                    //networkIndex = payload.readUInt8(pos); //no longer used (always 1)
                    break;
                }
                case WIFI_FIELDS.ENCRYPTION_TYPE: {
                    encTypeCode = payload.readUint16BE(pos);
                    break;
                }
                case WIFI_FIELDS.MAC_ADDRESS: {
                    macRaw = payload.subarray(pos, pos + fieldSize);
                    break;
                }
                default: {
                    console.log('Unknown'); break;
                }
            }

            pos += fieldSize;
        }

        return new WiFiRecord(ssid, networkKey, authTypeCode, encTypeCode, macRaw, null, id, payload, recordNumber)
    }

    static create(ssid, networkKey, authTypeCode, encTypeCode, mac, extended = null, id = null) {
        var macRaw;

        if (typeof mac === 'string') {
            if (!(value.match(MAC_REGEX) || (value.length == 12 && value.match(HEX_REGEX)))) {
                throw 'Invalid MAC Address';
            }
            macRaw = Buffer.from(value.replaceAll(':', ''), 'hex').reverse();
        } else if (mac instanceof Buffer) {
            macRaw = mac;
        } else {
            throw 'Invalid MAC type';
        }

        return new WiFiRecord(ssid, networkKey, authTypeCode, encTypeCode, macRaw, extended, id);
    }

    toString() {
        return `- WiFi Network -\nNetwork Name: ${this.SSID}\nNetwork Key: ${this.NetworkKey}\n` +
            `Auth Type: ${this.AuthType}\nEncryption: ${this.EncryptionType}\n----------------`
    }
}


module.exports = {
    HEADER_FLAGS: HEADER_FLAGS,

    URI_PREFIXES: URI_PREFIXES,
    URI_PREFIX_CODES: URI_PREFIX_CODES,

    WIFI_AUTH_TYPES: WIFI_AUTH_TYPES,
    WIFI_ENCRYPTION_TYPES: WIFI_ENCRYPTION_TYPES,

    TextEncodingType: TEXT_ENCODING_TYPE,

    NdefHeader: NdefHeader,
    NdefRecord: NdefRecord,
    TextRecord: TextRecord,
    UriRecord: UriRecord,
    VCardRecord: VCardRecord,
    AndroidAppRecord: AndroidAppRecord,
    BlueToothRecord: BlueToothRecord,
    WiFiRecord: WiFiRecord,

    BluetoothOobData: BluetoothOobData
}