const ZERO = 0x00;

const STANDARD_CLASS = 0xFF;

const INS = {
    GET_RESPONSE: 0xC0,
    GET_DATA: 0xCA,
    PUT_DATA: 0xDA,

    READ_BINARY: 0xB0,
    WRITE_BINARY: 0xD0,
    UPDATE_BINARY: 0xD6,
    ERASE_BINARY: 0x0E,

    READ_RECORD: 0xB2,
    WRITE_RECORD: 0xD2,
    UPDATE_RECORD: 0xDC,
    APPEND_RECORD: 0xE2,

    VERIFY: 0x20,

    GET_CHALLENGE: 0x84,
    LOAD_KEY: 0x82,
    INTERNAL_AUTHENTICATE: 0x86,
    INTERNAL_AUTHENTICATE_OLD: 0x88,

    MANAGE_CHANNEL: 0x70,
    SELECT: 0xA4,
    ENVELOPE: 0xC2,
}
const GET_DATA_TYPES = {
    UID: [0x00, 0x00],  //This is the protocol-level identifier. It may be different from the actual UID.
    ATS: [0x01, 0x00],  //The ISO 14443-4 ATS (NFC-A cards only)
    RFU: [0x02, 0x00],
    PIX: [0xF1, 0x00],  //Type of card according to PC/SC part 3: return PIX.SS, PIX.NN on 3 bytes (1st byte is 03 for NFC-A, 07 for NFC-B, 0B for NFC-V and 11 for NFC-F)
    NFC_FORUM_TAG: [0xF1, 0x01],  //01 to 05 if the card is recognized as a NFC Forum tag type, 00 otherwise
    ATR: [0xFA, 0x00],      //Same value as returned by SCardConnect
    REPGEN: [0xFA, 0x01],   //Contact-side ATR of a Calypso card using the Innovatron protocol
    ANTENNA: [0xFB, 0x00],  //Index of the active antenna (in case the device has more than one)
    BITRATE_INDEXES: [0xFC, 0x00],      //Return DSI, DRI on 2 bytes
    PCD_TO_PICC_BITRATE: [0xFC, 0x01],  //Return the actual DR, in kbps, on 2 bytes
    PICC_TO_PCD_BITRATE: [0xFC, 0x02],  //Return the actual DR, in kbps, on 2 bytes
    SERIAL_NUMBER: [0xFF, 0x00]     //Device's serial number
}

const GENERAL_APDU_RESPONSE_CODES = {
    SUCCESSFUL: 0x9000,
    VERIFY_FAILED: 0x6300,
    FILE_NOT_FOUND: 0x6A82
}

const GENERAL_APDU_RESPONSES = {
    0x9000: 'Successful',
    0x6300: 'Verify Failed'
}

const AUTH = {
    LC: 0x05,
    VERSION_1: 0x01
}

const SELECT_MODE = {
    NAME: 0x04,
    ID: ZERO
}

const LOAD_KEY_STRUCTS = {
    create: (key, trans, loc, idx) => {
        throw 'Not Implemented';
    },
    PICC_KEY_PLAIN_TRAINS_VOLATILE_MEM: 0x00
}

const LOAD_KEY_RESP = {
    SECURE_TRANSMISSION_FAILED: 0x6300, //Secure transmission failed (DataIN SECURE is invalid)
    PICC_NOT_SUPPORTED: 0x6382,         //PICC key not supported (possible root reason: incompatible entry)
    HOST_KEY_NOT_SUPPORTED: 0x6383,     //Host key not supported(possible root reason: incompatible entry, key type is not AES)
    PLAIN_TRANSMISSION_NOT_SUPPORTED: 0x6384, //Plain transmission not supported (possible root reason: secure transmission enforced by configuration) Plain transmission not allowed for a host key
    SECURE_TRANSMISSON_NOT_SUPPORTED: 0x6385, //Secure transmission not supported (possible root reason: the host key index specified in bits 3-0 of P1 is not allowed)
    VOLATILE_MEM_NOT_AVAIL: 0x6386,     //Volatile memory is not available host key can't be loaded into the volatile memory
    NON_VOLATILE_MEM_NOT_AVAIL: 0x6387, //Non volatile memory is not available (the device does not have a Secure Element)
    KEY_INDEX_NOT_VALID: 0x6388,        //Key index is not valid Key index is not allowed for the key type
    LEY_LENGTH_NOT_VALID: 0x6389,       //Key length is not valid Key length does not match the key type
}

const AUTH_KEY_STRUCTS = {
    KEY_FROM_VOLATILE_MEM: 0x00,
    KEY_FROM_SAM_AV: 0x20
}

const AUTH_RESP = {
    GENERAL_ERROR: 0x6300, 	        //General error
    SECURITY_NOT_SATISFIED: 0x6382, //Security status not satisfied - A host/device authentication must be performed first
    PICC_ATUH_FAILED: 0x6383, 	    //Authentication with the PICC failed
    KEY_NOT_VAILD: 0x6384, 	        //The selected key is not valid for this type of PICC
    KEY_TYPE_NOT_VAILD: 0x6386, 	//The type of key is not supported
    KEY_INDEX_NOT_VAILD: 0x6388, 	//Key index is not valid The selected key is not valid for this PICC
    KEY_LENGTH_NOT_VAILD: 0x6389, 	//Key length is not valid The selected key is not valid for this PICC
    KEY_ADDRESED_DOES_NOT_EXISTS: 0x6581, 	//The key addressed by P1-P2 does not exist
}


module.exports = {
    ZERO: ZERO,
    STANDARD_CLASS: STANDARD_CLASS,
    INS: INS,
    GET_DATA_TYPES: GET_DATA_TYPES,
    AUTH: AUTH,
    GENERAL_APDU_RESPONSES: GENERAL_APDU_RESPONSES,
    GENERAL_APDU_RESPONSE_CODES: GENERAL_APDU_RESPONSE_CODES,
    LOAD_KEY_RESP: LOAD_KEY_RESP,
    AUTH_RESP: AUTH_RESP,
    LOAD_KEY_STRUCTS: LOAD_KEY_STRUCTS,
    AUTH_KEY_STRUCTS: AUTH_KEY_STRUCTS,
    SELECT_MODE: SELECT_MODE
}