const utils = require('../utils');
const {
    NdefHeader,
    NdefRecord,
    TextRecord,
    UriRecord,
    VCardRecord,
    AndroidAppRecord,
    BlueToothRecord,
    WiFiRecord
} = require('./NdefRecords');

const {
    HEADER_FLAGS,
    TLV_TYPES,
    TNF_CODES: TNF_VALUES,
    WELL_KNOWN_TYPES,
    EXTERNAL_TYPES,
    MEDIA_TYPES
} = require('./NDEF_CONSTS');

class NdefMessage {
    static TNF_VALUES = TNF_VALUES;
    static WELL_KNOWN_TYPES = WELL_KNOWN_TYPES;
    static EXTERNAL_TYPES = EXTERNAL_TYPES;
    static MEDIA_TYPES = MEDIA_TYPES;

    _records = [];

    get Records() {
        return this._records;
    }

    addRecord(record) {
        if (record) this._records.push(record);
    }

    get length() {
        return this._records.length;
    }

    static fromBytes(byteArr) {
        const msg = new NdefMessage();

        var idx = 0;
        var header = null;
        var recordNumber = 1;
        var dataEnd = byteArr.length;

        while (byteArr[idx] != TLV_TYPES.NDEF_MSG) {
            idx++;
        }

        if (byteArr[++idx] == 0xFF) {
            dataEnd = byteArr.readUint16BE(idx + 1) + idx + 3;
            idx += 3;
        } else {
            dataEnd = byteArr[idx] + idx;
            idx++
        }

        // if (skipHeaderInfo) {
        //     if (byteArr[3] == 0xFF) {
        //         dataEnd = byteArr[3] + byteArr[4] + byteArr[5];
        //         idx = 6;
        //     } else if (byteArr[3] == 0x3b) {
        //         dataEnd = byteArr[3];
        //         idx = 4;
        //     }
        // }

        while (idx < byteArr.length && idx < dataEnd) {
            const headerByte = byteArr[idx];

            if (header || utils.hasFlag(headerByte, HEADER_FLAGS.MESSAGE_BEGIN)) {
                header = new NdefHeader(headerByte);

                const typeIdx = idx + 1;
                const typeLength = byteArr[typeIdx];
                var payloadLength = -1, payloadLengthLength = 1;
                const payloadLengthStartIdx = typeIdx + 1;

                if (header.IsShortRecord) {
                    payloadLength = byteArr[payloadLengthStartIdx];
                } else {
                    payloadLengthLength = 4;
                    payloadLength = Buffer.from(new Uint8Array(byteArr
                        .subarray(payloadLengthStartIdx, payloadLengthStartIdx + payloadLengthLength)))
                        .readInt32BE();
                }

                var idLength = 0;
                const idLengthStartIdx = payloadLengthStartIdx + payloadLengthLength;

                if (header.HasIDLength) {
                    idLength = byteArr[idLengthStartIdx];
                }

                const idLengthEndIdx = idLengthStartIdx + (header.HasIDLength ? 1 : 0);
                const typeEndIdx = idLengthEndIdx + typeLength;

                const typeArr = byteArr.subarray(idLengthEndIdx, idLengthEndIdx + typeLength);
                const type = typeArr.toString('utf8');

                const idStartIdx = typeEndIdx;
                const id = header.HasIDLength ? new Uint8Array(byteArr.buffer, idStartIdx, idLength) : null;

                const payloadStartIdx = idStartIdx + idLength;
                const payload = byteArr.subarray(payloadStartIdx, payloadStartIdx + payloadLength);

                if (type.length > 0 && payload.length > 0) {

                    if (header.TypeNameFormat != TNF_VALUES.EMPTY) {
                        recordNumber++;
                    }

                    switch (header.TypeNameFormat) {
                        case TNF_VALUES.WELL_KNOWN: {
                            switch (type) {
                                case WELL_KNOWN_TYPES.TEXT: { //txt
                                    msg.addRecord(TextRecord.fromBytes(payload, id, recordNumber));
                                    break;
                                }
                                case WELL_KNOWN_TYPES.URI: { //uri
                                    msg.addRecord(UriRecord.fromBytes(payload, id, recordNumber));
                                    break;
                                }
                                default:
                                    msg.addRecord(new NdefRecord(payload, id, header.TypeNameFormat, type, recordNumber));
                                    break;
                            }
                            break;
                        }
                        case TNF_VALUES.MEDIA: {
                            switch (type) {
                                case MEDIA_TYPES.VCARD:
                                    msg.addRecord(VCardRecord.fromBytes(payload, id, recordNumber));
                                    break;
                                case MEDIA_TYPES.BLUETOOTH:
                                    msg.addRecord(BlueToothRecord.fromBytes(payload, id, recordNumber));
                                    break;
                                case MEDIA_TYPES.WIFI:
                                    msg.addRecord(WiFiRecord.fromBytes(payload, id, recordNumber));
                                    break;
                                default:
                                    msg.addRecord(new NdefRecord(payload, id, header.TypeNameFormat, type, recordNumber));
                                    break
                            }
                            break;
                        }
                        case TNF_VALUES.EXTERNAL: {
                            switch (type) {
                                case EXTERNAL_TYPES.ANDROID_APP:
                                    msg.addRecord(AndroidAppRecord.fromBytes(payload, id, recordNumber));
                                    break;
                                default:
                                    msg.addRecord(new NdefRecord(payload, id, header.TypeNameFormat, type, recordNumber));
                                    break
                            }
                            break;
                        }
                        case TNF_VALUES.ABSOLUTE_URI:
                        case TNF_VALUES.UNKNOWN:
                        case TNF_VALUES.UNCHANGED:
                        case TNF_VALUES.RESERVED:
                        default:
                            msg.addRecord(new NdefRecord(payload, id, header.TypeNameFormat, type, recordNumber));
                            break;
                        case TNF_VALUES.EMPTY: break;
                    }
                }

                if (utils.hasFlag(headerByte, HEADER_FLAGS.MESSAGE_END)) {
                    if (header == null) break;
                    header = null;
                }

                idx = payloadStartIdx + payloadLength;
            } else {
                idx++;
            }
        }

        return msg;
    }

    toBytes() {
        const chunks = [];

        if (this.Records.length < 1) {
            throw 'No Records in Message'
        };

        const totalRecords = this.Records.length;
        var recordCount = 0;

        this.Records.forEach(record => {
            const payload = record.toBytes();
            var flags = record.TypeNameFormat;

            //set BEGIN & END FLAG
            if (recordCount == 0)
                flags |= HEADER_FLAGS.MESSAGE_BEGIN;
            if (recordCount == totalRecords - 1)
                flags |= HEADER_FLAGS.MESSAGE_END;

            //chunk no supported

            //set Short Record
            if (payload.length < 255)
                flags |= HEADER_FLAGS.SHORT_RECORD;

            //set ID
            if (record.ID != null && record.ID.length > 0)
                flags |= HEADER_FLAGS.ID_LENGTH_PRESENT;

            chunks.push(Buffer.from([flags]));

            //Type Length
            chunks.push(Buffer.from([record.Type ? record.Type.length : 0]));

            //Payload Length
            if (payload.length < 255)
                chunks.push(Buffer.from([payload.length]))
            else {
                var b = Buffer.alloc(4);
                b.writeUInt32BE(payload.length, 0);
                chunks.push(b);
            }

            //ID Length
            if (record.ID != null && record.ID.length > 0)
                chunks.push(Buffer.from([record.ID.length]));

            //Type
            if (record.Type != null && record.Type.length > 0)
                chunks.push(Buffer.from(record.Type, 'utf8'));

            //ID
            if (record.ID != null && record.ID.length > 0)
                chunks.push(record.ID);

            //Payload
            chunks.push(payload);
        });

        return Buffer.concat(chunks);
    }
}

module.exports = NdefMessage;
