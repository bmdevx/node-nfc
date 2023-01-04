const utils = require('../utils');
const {
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
    TEXT_ENCODING_TYPE
} = require('./NDEF_CONSTS');

class NdefHeader {
    static HEADER_FLAGS = HEADER_FLAGS;

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
    constructor(header, payload, id, type, recordNumber = 0) {
        this._header = header;
        this._id = id;
        this._recNum = recordNumber;
        this._type = type;
        this._payload = payload;
    }

    get Header() { return this._header; }

    get ID() { return this._id; }

    get RecordNumber() { return this._recNum; }

    get Type() { return this._type; }

    get Payload() { return this._payload; }


    toString() {
        return `Record #${this.RecordNumber}[RID:${this.RecordInfo.RecordID}, TNF:${this.Header.TypeNameFormat}, Type:${this.Type}]: ${new TextDecoder().decode(this.Payload)}`
    }

    toBytes() {
        return (this.Payload && this.Payload instanceof Buffer) ? this.Payload : Buffer.alloc(0);
    }
}

class TextRecord extends NdefRecord {
    constructor(header, payload, id, type, recordNumber, text = null, language = null, encodingType = null) {
        super(header, payload, id, type, recordNumber);

        const eb = payload != null ? payload[0] : 0;

        this._encodingType = encodingType ? encodingType : utils.hasFlag(eb, 1 << 7) ? TEXT_ENCODING_TYPE.UTF16 : TEXT_ENCODING_TYPE.UTF8;
        this._language = language ? language : payload.subarray(1, (eb & 0x0F) + 1).toString('utf8');
        this._text = text ? text : payload.subarray(3).toString(this._encoding);
    }

    get Type() { return WELL_KNOWN_TYPES.TEXT; }

    get EncodingType() { return this._encodingType; }
    set EncodingType(encodingType) { this._encodingType = encodingType; }

    get Encoding() { return this._encodingType == TEXT_ENCODING_TYPE.UTF16 ? 'utf16' : 'utf8' }

    get Language() { return this._language; }
    set Language(lang) { this._language = lang; }

    get Text() { return this._text; }
    set Text(text) { this._text = text; }


    static create(text, lang = 'en', encodingType = TEXT_ENCODING_TYPE.UTF8, header = null, id = null) {
        return new TextRecord(
            header ?
                header : NdefHeader.create(
                    false,
                    (text.length + lang.length + 1) < 255,
                    id != null,
                    TNF_VALUES.WELL_KNOWN
                ),
            null,
            id,
            WELL_KNOWN_TYPES.TEXT,
            0,
            text, lang, encodingType
        );
    }

    toBytes() {
        if (this.Payload) {
            return this.Payload;
        } else {
            var eb = 0x0;

            //set encoding to to first byte
            if (this.EncodingType == TEXT_ENCODING_TYPE.UTF8) {
                eb &= 0x7F;
            } else {
                eb |= 0x80;
            }

            //set language code length to first byte
            eb |= (0x3f & this.Language.length);

            return Buffer.concat([Buffer.from([eb]), Buffer.from(this.Language), Buffer.from(this.Text, this.Encoding)])
        }
    }

    toString() { return `${this.Language.length > 0 ? `[${this.Language}] ` : ''}${this.Text}`; }
}

class UriRecord extends NdefRecord {
    static URI_PREFIXES = URI_PREFIXES;
    static URI_PREFIX_CODES = URI_PREFIX_CODES;

    constructor(header, payload, id, type, recordNumber = 0) {
        super(header, payload, id, type, recordNumber);

        this._uriId = payload[0];
        this._uriContent = payload.subarray(1).toString('utf8');
    }

    get UriId() { return this._uriId; }
    get UriPrefix() { return URI_PREFIXES[this._uriId] != undefined ? URI_PREFIXES[this._uriId] : ''; }
    get UriContent() { return this._uriContent; }
    get Uri() { return this.UriPrefix + this._uriContent; }

    toString() { return this.Uri; }
}

class VCardRecord extends NdefRecord {
    constructor(header, payload, id, type, recordNumber = 0) {
        super(header, payload, id, type, recordNumber);

        this._tags = [];

        const parts = payload.toString('utf8').split('\n');

        parts.forEach(part => {
            const lower = part.toLowerCase();
            if (lower.startsWith('begin')) {
                //
            } else if (lower.startsWith('end')) {
                return;
            } else {
                const idx = part.indexOf(':');
                const attr = part.substring(0, idx);
                const value = part.substring(idx + 1).trim();

                this._tags.push(attr);

                this[attr] = value;
            }
        });
    }

    toString() {
        var text = '- vcard -\n';
        this._tags.forEach(attr => {
            text += `${attr}: ${this[attr]}\n`;
        });
        text += '--------'
        return text;
    }
}

class AndroidAppRecord extends NdefRecord {
    constructor(header, payload, id, type, recordNumber = 0) {
        super(header, payload, id, type, recordNumber);
        this._packageName = payload.toString('utf8');
    }

    get PackageName() { return this._packageName; }

    toString() { return `[Android App]: ${this.PackageName}`; }
}

class BlueToothRecord extends NdefRecord {
    constructor(header, payload, id, type, recordNumber = 0) {
        super(header, payload, id, type, recordNumber);

        this._btPayloadLength = Buffer.from(new Uint8Array(payload.subarray(0, 2).reverse())).readInt16BE();

        this._addressRaw = payload.subarray(2, 9);
        this._address = utils.toHexString(this._addressRaw.reverse(), ':');
    }

    get Address() { return this._address; }
    get AddressRaw() { return this._addressRaw; }

    toString() { return `[Bluetooth]: ${this.Address}`; }
}

class WiFiRecord extends NdefRecord {
    static WIFI_AUTH_TYPES = WIFI_AUTH_TYPES;
    static WIFI_ENCRYPTION_TYPES = WIFI_ENCRYPTION_TYPES;

    constructor(header, payload, id, type, recordNumber = 0) {
        super(header, payload, id, type, recordNumber);

        const ID_AND_SIZE_SIZE = 4;

        const dv = new DataView(new Uint8Array(payload).buffer);
        var fieldId = dv.getUint16(0);
        var fieldSize = dv.getUint16(2);
        const endIdx = fieldSize + ID_AND_SIZE_SIZE;

        var pos = ID_AND_SIZE_SIZE;

        const getTextField = (idx, size) => {
            return payload.subarray(idx, idx + size).toString('utf8');
        }

        while (pos < endIdx) {
            fieldId = dv.getUint16(pos);
            fieldSize = dv.getUint16(pos + 2);

            pos += ID_AND_SIZE_SIZE;

            switch (fieldId) {
                case WIFI_FIELDS.SSID: {
                    this._ssid = getTextField(pos, fieldSize);
                    break;
                }
                case WIFI_FIELDS.NETWORK_KEY: {
                    this._networkKey = getTextField(pos, fieldSize);
                    break;
                }
                case WIFI_FIELDS.AUTH_TYPE: {
                    const authTypeCode = this._authTypeCode = dv.getUint16(pos);
                    var authType;

                    const addType = (at) => {
                        if (authType) {
                            authType += ` | ${at}`;
                        } else {
                            authType = at;
                        }
                    }

                    if (utils.hasFlag(authTypeCode, WIFI_AUTH_TYPES.WPA_PSK)) {
                        addType('WPA_PSK');
                    }

                    if (utils.hasFlag(authTypeCode, WIFI_AUTH_TYPES.WPA_EAP)) {
                        addType('WPA_EAP');
                    }

                    if (utils.hasFlag(authTypeCode, WIFI_AUTH_TYPES.WPA2_PSK)) {
                        addType('WPA2_PSK');
                    }

                    if (utils.hasFlag(authTypeCode, WIFI_AUTH_TYPES.WPA2_EAP)) {
                        addType('WPA2_EAP');
                    }

                    if (authTypeCode === WIFI_AUTH_TYPES.OPEN) {
                        authType = 'OPEN';
                    }

                    this._authType = authType;
                    break;
                }
                case WIFI_FIELDS.NETWORK_INDEX: {
                    this._networkIndex = dv.getUint8(pos);
                    break;
                }
                case WIFI_FIELDS.ENCRYPTION_TYPE: {
                    const encCodeType = this._encTypeCode = dv.getUint16(pos);

                    var encType;

                    const addType = (enc) => {
                        if (encType) {
                            encType += ` | ${enc}`;
                        } else {
                            encType = enc;
                        }
                    }

                    if (utils.hasFlag(encCodeType, WIFI_ENCRYPTION_TYPES.AES)) {
                        addType('AES');
                    }

                    if (utils.hasFlag(encCodeType, WIFI_ENCRYPTION_TYPES.TKIP)) {
                        addType('TKIP');
                    }

                    if (utils.hasFlag(encCodeType, WIFI_ENCRYPTION_TYPES.WEP)) {
                        addType('WEP');
                    }

                    if (encCodeType == WIFI_ENCRYPTION_TYPES.NONE) {
                        encType = 'NONE';
                    }

                    this._encType = encType;
                }
                case WIFI_FIELDS.MAC_ADDRESS: {
                    this._macRaw = payload.subarray(pos, pos + fieldSize);
                    this._mac = utils.toHexString(this._macRaw.reverse(), ':');
                    break;
                }
                default: {
                    console.log('Unknown'); break;
                }
            }

            pos += fieldSize;
        }
    }

    get SSID() { return this._ssid; }
    get NetworkKey() { return this._networkKey; }
    get AuthTypeCode() { return this._authTypeCode; }
    get AuthType() { return this._authType; }
    get NetworkIndex() { return this._networkIndex; }
    get EncryptionTypeCode() { return this._encTypeCode; }
    get EncryptionType() { return this._encType; }

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
    WiFiRecord: WiFiRecord
}