const TLV_TYPES = {
    NULL: 0x00,
    LOCK_CONTROL: 0x01,
    MEM_CONTROL: 0x02,
    NDEF_MSG: 0x03,
    PROPRIETARY: 0xFD,
    TERMINATOR: 0xFE
}

/**
 * Type Name Format values
 */
const TNF_VALUES = {
    EMPTY: 0x00,
    WELL_KNOWN: 0x01,
    MEDIA: 0x02,
    ABSOLUTE_URI: 0x03,
    EXTERNAL: 0x04,
    UNKNOWN: 0x05,
    UNCHANGED: 0x06,
    RESERVED: 0x07
}

const WELL_KNOWN_TYPES = {
    TEXT: 'T',
    URI: 'U'
}

const EXTERNAL_TYPES = {
    ANDROID_APP: 'android.com:pkg'
}

const MEDIA_TYPES = {
    VCARD: 'text/vcard',
    BLUETOOTH: 'application/vnd.bluetooth.ep.oob',
    WIFI: 'application/vnd.wfa.wsc'
}


const HEADER_FLAGS = {
    MESSAGE_BEGIN: 0x80,
    MESSAGE_END: 0x40,
    CHUNKED: 0x20,
    SHORT_RECORD: 0x10,
    ID_LENGTH_PRESENT: 0x08,
    MASK_TNF: 0x07
}

const URI_PREFIX_CODES = {
    NONE: 0x00,
    HTTP_WWW: 0x01,
    HTTPS_WWW: 0x02,
    HTTP: 0x03,
    HTTPS: 0x04,
    TEL: 0x05,
    MAILTO: 0x06,
    FTP_ANON: 0x07,
    FTP_FTP: 0x08, // ftp://ftp
    FTPS: 0x09,
    SFTP: 0x0A,
    SMB: 0x0B,
    NFS: 0x0C,
    FTP: 0x0D,
    DAV: 0x0E,
    NEWS: 0x0F,
    TELNET: 0x10,
    IMAP: 0x11,
    RTSP: 0x12,
    URN: 0x13,
    POP: 0x14,
    SIP: 0x15,
    SIPS: 0x16,
    TFTP: 0x17,
    BTSPP: 0x18,
    BTL2CAP: 0x19,
    BTGOEP: 0x1A,
    TCPOBEX: 0x1B,
    IRDAOBEX: 0x1C,
    FILE: 0x1D,
    URN_EPC_ID: 0x1E,
    URN_EPC_TAG: 0x1F,
    URN_EPC_PAT: 0x20,
    URN_EPC_RAW: 0x21,
    URN_EPC: 0x22,
    URN_NFC: 0x23,
}

const URI_PREFIXES = {
    0x00: '',
    0x01: 'http://www.',
    0x01: 'http://www.',
    0x02: 'https://www.',
    0x03: 'http://',
    0x04: 'https://',
    0x05: 'tel:',
    0x06: 'mailto:',
    0x07: 'ftp://anonymous:anonymous@',
    0x08: 'ftp://ftp.',
    0x09: 'ftps://',
    0x0A: 'sftp://',
    0x0B: 'smb://',
    0x0C: 'nfs://',
    0x0D: 'ftp://',
    0x0E: 'dav://',
    0x0F: 'news:',
    0x10: 'telnet://',
    0x11: 'imap:',
    0x12: 'rtsp://',
    0x13: 'urn:',
    0x14: 'pop:',
    0x15: 'sip:',
    0x16: 'sips:',
    0x17: 'tftp:',
    0x18: 'btspp://',
    0x19: 'btl2cap://',
    0x1A: 'btgoep://',
    0x1B: 'tcpobex://',
    0x1C: 'irdaobex://',
    0x1D: 'file://',
    0x1E: 'urn:epc:id:',
    0x1F: 'urn:epc:tag:',
    0x20: 'urn:epc:pat:',
    0x21: 'urn:epc:raw:',
    0x22: 'urn:epc:',
    0x23: 'urn:nfc:',
}

const WIFI_FIELDS = {
    CREDENTIAL: 0x100E,
    SSID: 0x1045,
    NETWORK_KEY: 0x1027,
    AUTH_TYPE: 0x1003,
    NETWORK_INDEX: 0x1026,
    ENCRYPTION_TYPE: 0x100F,
    MAC_ADDRESS: 0x1020,
}

const WIFI_AUTH_TYPES = {
    OPEN: 0,
    WPA_PSK: 0x0002,
    WPA_EAP: 0x0008,
    WPA2_EAP: 0x0010,
    WPA2_PSK: 0x0020
}

const WIFI_ENCRYPTION_TYPES = {
    NONE: 0x0001,
    WEP: 0x0002,
    TKIP: 0x0004,
    AES: 0x0008
}

const TEXT_ENCODING_TYPE = {
    UTF8: 0,
    UTF16: 1
}


module.exports = {
    TLV_TYPES: TLV_TYPES,
    HEADER_FLAGS: HEADER_FLAGS,

    TNF_VALUES: TNF_VALUES,
    WELL_KNOWN_TYPES: WELL_KNOWN_TYPES,
    EXTERNAL_TYPES: EXTERNAL_TYPES,
    MEDIA_TYPES: MEDIA_TYPES,

    URI_PREFIX_CODES: URI_PREFIX_CODES,
    URI_PREFIXES: URI_PREFIXES,
    WIFI_FIELDS: WIFI_FIELDS,
    WIFI_AUTH_TYPES: WIFI_AUTH_TYPES,
    WIFI_ENCRYPTION_TYPES: WIFI_ENCRYPTION_TYPES,
    TEXT_ENCODING_TYPE: TEXT_ENCODING_TYPE
}