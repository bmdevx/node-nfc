const {
    ZERO,
    STANDARD_CLASS,
    INS,
    AUTH,
    LOAD_KEY_STRUCTS,
    AUTH_KEY_STRUCTS,
    SELECT_MODE
} = require('./CMD_CONSTS');


class BasicCommands {

    static GetData(getDataTypeValue, _class = STANDARD_CLASS) {
        return Buffer.from([_class, INS.GET_DATA].concat(getDataTypeValue, [ZERO]));
    }

    static ReadBinary(blockNumber, length, _class = STANDARD_CLASS) {
        return Buffer.from([
            _class,
            INS.READ_BINARY,
            (blockNumber >> 8) & 0xFF,
            blockNumber & 0xFF,
            length,
        ]);
    }

    static WriteBinary(blockNumber, blockSize, data, _class = STANDARD_CLASS) {
        return Buffer.from([
            _class,
            INS.WRITE_BINARY,
            ZERO,
            blockNumber,
            blockSize
        ].concat(data));
    }

    static UpdateBinary(blockNumber, blockSize, data, _class = STANDARD_CLASS) {
        return Buffer.from([
            _class,
            INS.UPDATE_BINARY,
            ZERO,
            blockNumber,
            blockSize,
            ...data
        ]);
    }

    static LoadAuthKeys(keyType, keyBytes, keyStructure = LOAD_KEY_STRUCTS.PICC_KEY_PLAIN_TRAINS_VOLATILE_MEM, _class = STANDARD_CLASS) {
        return Buffer.from([
            _class,
            INS.LOAD_KEY,
            keyStructure,
            keyType,
            keyBytes.length,
            ...keyBytes
        ]);
    }

    static Authenticate(blockNumber, keyType, keyNum, keyStructure = AUTH_KEY_STRUCTS.KEY_FROM_VOLATILE_MEM, keyIndex = ZERO, _class = STANDARD_CLASS) {
        return Buffer.from([
            _class, // Class
            INS.INTERNAL_AUTHENTICATE, // INS
            keyStructure, // P1
            keyIndex, // P2
            AUTH.LC, // Lc

            // Data In: Authenticate Data Bytes (5 bytes)
            AUTH.VERSION_1, // Byte 1: Version
            ZERO, // Byte 2
            blockNumber, // Byte 3: Block Number
            keyType, // Byte 4: Key Type
            keyNum   // Byte 5: Key Number
        ]);
    }

    static AuthenticateOld(blockNumber, keyType, keyNum, _class = STANDARD_CLASS) {
        return Buffer.from([
            _class, // Class
            INS.INTERNAL_AUTHENTICATE_OLD, // INS
            ZERO, // P1
            blockNumber, // P2: Block Number
            keyType, // P3: Key Type
            keyNum, // Data In: Key Number
        ]);
    }

    static Select(aid, select_mode = SELECT_MODE.NAME, _class = ZERO) {
        return Buffer.from([
            _class, // Class
            INS.SELECT, // INS
            select_mode, // P1
            ZERO, // P2
            aid.length, // LC aid length
            ...aid, //AID
        ]);
    }
}

module.exports = BasicCommands;