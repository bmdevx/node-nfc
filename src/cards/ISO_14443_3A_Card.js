const { Card, CardSector } = require('./Card');
const {
    CARD_STANDARDS,
    KEY_TYPE_A,
    KEY_TYPE_B,
    FORMAT_TYPE,
    DEFAULT_KEYS,
    DATA_PADDING,
    DEFAULT_BLOCKS_IN_SECTOR,
    DEFAULT_TOTAL_SECTORS,
    ACCESS_TYPE,
    ACCESS_GROUP
} = require('./CARD_CONSTS');
const {
    GENERAL_APDU_RESPONSES,
    GENERAL_APDU_RESPONSE_CODES,
    GET_DATA_TYPES,
    STANDARD_CLASS,
    LOAD_KEY_STRUCTS,
    AUTH_KEY_STRUCTS,
    ZERO
} = require('./commands/CMD_CONSTS')
const BasicCommands = require('./commands/BasicCommands');
const {
    ReadError,
    GetUIDError,
    AuthenticationError,
    LoadAuthenticationKeyError,
    INVALID_RESPONSE,
    OPERATION_FAILED,
    INVALID_KEY_TYPE,
    INVALID_KEY,
    INVALID_KEY_OR_KEY_TYPE
} = require('../errors');
const { NdefMessage } = require('../ndef/ndef');
const { TLV_TYPES } = require('../ndef/NDEF_CONSTS');
const { Mutex } = require('async-mutex');

class ISO_14443_3A_Card extends Card {
    _cardTypeName = null;
    _cardTypeId = null;
    _rid = null;
    _uid = null;
    _keys = {}

    constructor(reader, atr, cardTypeId, cardTypeName) {
        super(reader, atr, cardTypeId, CARD_STANDARDS.ISO_14443_3);

        this._length = atr[6];
        this._rid = atr.subarray(7, 12);

        this._cardTypeId = cardTypeId;
        this._cardTypeName = cardTypeName;

        this._mutexKeys = new Mutex();
    }


    connect() {
        return new Promise((res, rej) => {
            super.connect()
                .then(_ => {
                    this.getUid()
                        .then(uid => {
                            this._uid = uid;
                        }).finally(_ => {
                            res(this._connection);
                        });
                })
        })
            .catch(err => {
                res(err);
            });
    }

    getUid() {
        return new Promise((res, rej) => {
            const packet = BasicCommands.GetData(GET_DATA_TYPES.UID);

            this.transmit(packet, 12)
                .then(response => {
                    if (response.length < 2) {
                        rej(new GetUIDError(INVALID_RESPONSE, `Invalid response length ${response.length}. Expected minimal length is 2 bytes.`))
                    }

                    // last 2 bytes are the status code
                    const statusCode = response.subarray(-2).readUInt16BE(0);

                    // an error occurred
                    if (statusCode !== 0x9000) {
                        rej(new GetUIDError(OPERATION_FAILED, 'Could not get card UID.'));
                    }

                    // strip out the status code (the rest is UID)
                    res(response.subarray(0, -2));
                });
        });
    }

    getCardInfo() {
        return new Promise((res, rej) => {
            this.readSector(0)
                .then(sector => {

                    const data = sector.RawBytes;

                    const uid = data.subarray(0, 4);
                    const bcc = data.subarray(4, 5);
                    const sak = data.subarray(5, 6);
                    const atqa = data.subarray(6, 8);

                    res({
                        uid: uid,
                        bcc: bcc,
                        sak: sak,
                        atqa: atqa
                    })
                })
                .catch(rej);
        });
    }

    loadAuthenticationKey(keyNumber, key, _class = STANDARD_CLASS) {
        return new Promise((res, rej) => {
            if (!(keyNumber === 0 || keyNumber === 1)) {
                rej(new LoadAuthenticationKeyError(INVALID_KEY_TYPE));
            }

            if (!Buffer.isBuffer(key) && !Array.isArray(key)) {
                if (typeof key !== 'string') {
                    rej(new LoadAuthenticationKeyError(
                        INVALID_KEY,
                        'Key must an instance of Buffer or an array of bytes or a string.',
                    ));
                }

                key = Buffer.from(key, 'hex');
            }

            if (key.length !== 6) {
                rej(new LoadAuthenticationKeyError(INVALID_KEY, 'Key length must be 6 bytes.'));
            }

            const packet = BasicCommands.LoadAuthKeys(keyNumber, key, LOAD_KEY_STRUCTS.PICC_KEY_PLAIN_TRAINS_VOLATILE_MEM, _class);

            this.transmit(packet, 2)
                .then(response => {
                    const statusCode = response.readUInt16BE(0);

                    if (statusCode !== GENERAL_APDU_RESPONSE_CODES.SUCCESSFUL) {
                        rej(new LoadAuthenticationKeyError(OPERATION_FAILED, `Load authentication key operation failed: Status code: ${statusCode}`));
                    }

                    this.keyStorage[keyNumber] = key;

                    res(keyNumber);
                })
                .catch(err => {
                    rej(new LoadAuthenticationKeyError(null, null, err));
                });
        });
    }

    // for PC/SC V2.01 use obsolete = true
    // for PC/SC V2.07 use obsolete = false [default]
    authenticate(blockNumber, keyType, key, useVersion201 = false, keyIndex = ZERO, _class = STANDARD_CLASS) {
        return new Promise((res, rej) => {
            if (!(keyType === KEY_TYPE_A || keyType === KEY_TYPE_B)) {
                rej(new LoadAuthenticationKeyError(INVALID_KEY_TYPE));
            }

            const sendAuth = (keyNumber) => {

                const packet = useVersion201 ?
                    BasicCommands.AuthenticateOld(blockNumber, keyType, keyNumber, AUTH_KEY_STRUCTS.KEY_FROM_VOLATILE_MEM, keyIndex, _class) :
                    BasicCommands.Authenticate(blockNumber, keyType, keyNumber, AUTH_KEY_STRUCTS.KEY_FROM_VOLATILE_MEM, keyIndex, _class);

                this.transmit(packet, 2)
                    .then(response => {
                        const statusCode = response.readUInt16BE(0);

                        if (statusCode !== GENERAL_APDU_RESPONSE_CODES.SUCCESSFUL) {
                            if (statusCode == GENERAL_APDU_RESPONSE_CODES.VERIFY_FAILED) {
                                rej(new AuthenticationError(statusCode, GENERAL_APDU_RESPONSES[statusCode], `Invalid Credentials.`));
                            } else {
                                rej(new AuthenticationError(OPERATION_FAILED, `Authentication operation failed: Status code: 0x${statusCode.toString(16)}`));
                            }
                        } else {
                            res(true);
                        }
                    })
                    .catch(err => {
                        rej(new AuthenticationError(null, null, err));
                    });
            };

            var keyNumber = Object.keys(this.keyStorage).find(n => this.keyStorage[n] === key);

            // key is not in the storage
            if (!keyNumber) {

                // If there isn't already an authentication process happening for this key, start it
                if (!this.pendingLoadAuthenticationKey[key]) {

                    // set key number to first
                    keyNumber = Object.keys(this.keyStorage)[0];

                    // if this number is not free
                    if (this.keyStorage[keyNumber] !== null) {
                        // try to find any free number
                        const freeNumber = Object.keys(this.keyStorage).find(n => this.keyStorage[n] === null);
                        // if we find, we use it, otherwise the first will be used and rewritten
                        if (freeNumber) {
                            keyNumber = freeNumber;
                        }
                    }

                    // Store the authentication promise in case other blocks are in process of authentication
                    this.pendingLoadAuthenticationKey[key] = this.loadAuthenticationKey(parseInt(keyNumber), key, _class);
                }

                this.pendingLoadAuthenticationKey[key]
                    .then(keyNumber => {
                        return sendAuth(keyNumber);
                    })
                    .catch(err => {
                        rej(new AuthenticationError('unable_to_load_key', 'Could not load authentication key into reader.', err));
                    })
                    .finally(_ => {
                        delete this.pendingLoadAuthenticationKey[key];
                    });
            } else {
                sendAuth(keyNumber);
            }
        });
    }


    readSector(sectorID, keyType = null, key = null, _class = STANDARD_CLASS) {
        return new Promise((res, rej) => {
            const startBlockNum = this.getStartBlock(sectorID), sectorSize = this.getSectorSize(sectorID);

            if (!key) {
                const sectorKeys = this.getKnownSectorKeys(sectorID);

                try {
                    [key, keyType] = this.getKeyAndTypeForAccess(startBlockNum, sectorID, sectorKeys, ACCESS_TYPE.READ, ACCESS_GROUP.DATA);
                } catch (err) {
                    rej(err);
                }
            }

            this._mutex
                .acquire()
                .then(release => {
                    this.authenticate(startBlockNum, keyType, key)
                        .then(authenticated => {
                            if (authenticated) {
                                this.read(startBlockNum, sectorSize, _class)
                                    .then(response => {
                                        if (response.length == sectorSize) {
                                            res(this.parseSector(sectorID, startBlockNum, response, sectorSize));
                                        } else {
                                            rej(new ReadError(INVALID_RESPONSE, `Incorrect response size. Expected ${sectorSize}, Received ${response.length}`));
                                        }
                                    })
                                    .catch(rej);
                            } else {
                                rej(new AuthenticationError(INVALID_KEY_OR_KEY_TYPE));
                            }
                        })
                        .catch(rej)
                        .finally(release);
                });
        });
    }

    readSectors(startSectorID = 1, endSectorId = -1, keyType = null, key = null, _class = STANDARD_CLASS) {
        return new Promise((res, rej) => {
            const totalSectors = this.getTotalSectors();

            if (endSectorId < 0) {
                endSectorId = totalSectors - 1;
            }

            if (startSectorID < 0 || startSectorID >= totalSectors) {
                rej('Invalid Start Sector Id');
            }

            if (endSectorId < startSectorID || endSectorId >= totalSectors) {
                rej('Invalid End Sector Id');
            }

            const sectors = [];

            const readSectorNum = (sn) => {
                this.readSector(sn, keyType, key, _class)
                    .then(sector => {
                        sectors.push(sector);

                        if (++sn < endSectorId) {
                            readSectorNum(sn);
                        } else {
                            res(sectors);
                        }
                    })
                    .catch(rej);
            };

            readSectorNum(startSectorID);
        });
    }

    readData(startSectorID = 1, endSectorId = -1, keyType = null, key = null, _class = STANDARD_CLASS) {
        return new Promise((res, rej) => {
            this.readSectors(startSectorID, endSectorId, keyType, key, _class)
                .then(sectors => {

                    if (sectors.length > 1) {
                        var len = 0, data = [];

                        sectors.forEach(s => {
                            len += s.Data.length; data.push(s.Data);
                        });

                        res(Buffer.concat(data, len));
                    } else {
                        res(sectors[0].Data);
                    }
                })
                .catch(rej);
        });
    }

    parseSector(sectorID, startBlockNum, response, sectorSize) {
        CardSector.parse(sectorID, startBlockNum, response, sectorSize)
    }


    writeSector(sector, keyType = null, key = null, _class = STANDARD_CLASS, writeAsUpdate = false) {
        return new Promise((res, rej) => {
            if (!(sector instanceof CardSector)) {
                rej('Object is not of instanceof CardSector');
            }

            if (typeof sector.StartBlockNum !== 'number') {
                rej('StartBlockNum is not a number');
            }

            if (!key) {
                const startBlockNum = this.getStartBlock(sector.SectorID), sectorSize = this.getSectorSize(sector.SectorID);

                if (!key) {
                    const sectorKeys = this.getKnownSectorKeys(sector.SectorID);

                    try {
                        [key, keyType] = this.getKeyAndTypeForAccess(startBlockNum, sector.SectorID, sectorKeys, ACCESS_TYPE.READ, ACCESS_GROUP.DATA);
                    } catch (err) {
                        rej(err);
                    }
                }
            }

            this._mutex
                .acquire()
                .then(release => {
                    this.authenticate(sector.StartBlockNum, keyType, key)
                        .then(authenticated => {
                            if (authenticated) {
                                if (sector.RawBytes) {
                                    this.write(sector.StartBlockNum, sector.RawBytes, _class, false, false, writeAsUpdate)
                                        .then(res)
                                        .catch(rej);
                                } else if (sector.Data) {
                                    this.write(sector.StartBlockNum, sector.Data, _class, false, true, writeAsUpdate)
                                        .then(res)
                                        .catch(rej);
                                } else {
                                    rej('There is no raw bytes or data ro write.')
                                }
                            } else {
                                rej(new AuthenticationError(INVALID_KEY_OR_KEY_TYPE));
                            }
                        })
                        .catch(rej)
                        .finally(release);
                });

        });
    }

    writeSectors(sectors, keyType = null, key = null, _class = STANDARD_CLASS, writeAsUpdate = false) {
        return new Promise((res, rej) => {
            if (!Array.isArray(sectors)) {
                rej('Sectors must be in an Array');
            }

            const commands = [];

            commands.forEach(sector => {
                if (sector instanceof CardSector) {
                    commands.push(this.writeSector(sector, keyType, key, _class, writeAsUpdate));
                } else {
                    rej('Object is not of instanceof Sector');
                }
            });

            return Promise.all(commands)
                .then(values => {
                    res(values);
                })
                .catch(rej);
        });
    }

    writeData(data, startSectorID = 1, keyType = null, key = null,
        _class = STANDARD_CLASS, dataPadding = DATA_PADDING.SECTOR_DATA, writeAsUpdate = false) {
        return new Promise((res, rej) => {
            if (startSectorID < 0 || startSectorID >= this.getTotalSectors()) {
                rej('Invalid Start Sector Id');
            }

            const commands = [];
            const blockSize = this.getBlockSize();
            const totalDataBlocks = data.length / blockSize;
            var sectorID = startSectorID;

            for (let b = 0; b < totalDataBlocks;) {
                const startBlock = this.getDataStartBlock(sectorID);
                const sectorDataSize = this.getSectorDataSize(sectorID);
                const blocksInSector = sectorDataSize / blockSize;

                const start = b * blockSize;

                var part = data.subarray(start, start + sectorDataSize);

                if (part.length < sectorDataSize && (part.length % blockSize) != 0 && dataPadding != DATA_PADDING.NONE) {
                    if (dataPadding == DATA_PADDING.BLOCK) {
                        part = Buffer.concat([part], (Math.ceil(part.length / blockSize) * blockSize));
                    } else if (dataPadding == DATA_PADDING.SECTOR_DATA) {
                        part = Buffer.concat([part], sectorDataSize);
                    }
                }

                commands.push(
                    new Promise((res, rej) => {
                        var sKey = key, sKeyType = keyType;
                        const dataToWrite = part;

                        if (!sKey) {
                            const sectorKeys = this.getKnownSectorKeys(sectorID);

                            try {
                                [sKey, sKeyType] = this.getKeyAndTypeForAccess(startBlock, sectorID, sectorKeys, ACCESS_TYPE.READ, ACCESS_GROUP.DATA);
                            } catch (err) {
                                rej(err);
                            }
                        }

                        this._mutex
                            .acquire()
                            .then(release => {
                                this.authenticate(startBlock, sKeyType, sKey)
                                    .then(authenticated => {
                                        if (authenticated) {
                                            this.write(startBlock, dataToWrite, _class, false, true, writeAsUpdate)
                                                .then(res)
                                                .catch(rej)
                                                .finally(release);
                                        } else {
                                            rej(new AuthenticationError(INVALID_KEY_OR_KEY_TYPE));
                                        }
                                    })
                                    .catch(rej);
                            });
                    })
                );

                //add number of data blocks written in the sector
                b += blocksInSector;
                //move to next sector
                sectorID++;
            }

            return Promise.all(commands)
                .then(values => {
                    res(values);
                })
                .catch(rej);
        });
    }

    writeNdefMsg(msg, startSectorId = 1, keyType = null, key = null,
        _class = STANDARD_CLASS, dataPadding = DATA_PADDING.BLOCK, writeAsUpdate = true) {
        return new Promise((res, rej) => {
            if (!(msg instanceof NdefMessage)) {
                rej('Message is not of type Ndef');
            }

            const data = this._getNdefData(msg);

            this.writeData(data, startSectorId, keyType, key, _class, dataPadding, writeAsUpdate)
                .then(res)
                .catch(rej);
        });
    }

    _getNdefData(msg) {
        const payload = msg.toBytes();
        var payloadLength;
        if (payload.length < 255)
            payloadLength = Buffer.from([payload.length])
        else {
            payloadLength = Buffer.alloc(3);
            payloadLength.writeUInt8(0xFF, 0);
            payloadLength.writeUInt16BE(payload.length, 1);
        }

        return Buffer.concat([
            Buffer.from([TLV_TYPES.NDEF_MSG]),
            payloadLength,
            payload,
            Buffer.from([TLV_TYPES.TERMINATOR])
        ]);
    }


    updateSector(data, sectorID, keyType = null, key = null,
        _class = STANDARD_CLASS, dataPadding = DATA_PADDING.SECTOR) {
        return this.writeSector(data, sectorID, keyType, key, _class, dataPadding, true);
    }

    updateSectors(data, startSectorID = 1, endSectorID = -1, keyType = null, key = null,
        _class = STANDARD_CLASS, dataPadding = DATA_PADDING.SECTOR) {
        return this.writeSectors(data, startSectorID, endSectorID, keyType, key, _class, dataPadding, true);
    }

    updateSectorsData(data, startSectorID = 1, endSectorID = -1, keyType = null, key = null,
        _class = STANDARD_CLASS, dataPadding = DATA_PADDING.SECTOR) {
        return this.writeSectorsData(data, startSectorID, endSectorID, keyType, key, _class, dataPadding, true);
    }

    updateData(data, startSectorID = 1, keyType = null, key = null,
        _class = STANDARD_CLASS, dataPadding = DATA_PADDING.SECTOR_DATA) {
        return this.writeData(data, startSectorID, keyType, key, _class, dataPadding, true);
    }


    format(format = FORMAT_TYPE.ZERO, startSectorID = 0, endSectorID = -1, keyType = null, key = null,
        _class = STANDARD_CLASS, writeAsUpdate = true) {
        return new Promise((res, rej) => {
            const totalSectors = endSectorID > -1 ? endSectorID : this.getTotalSectors();

            var dataSize = 0;
            for (var i = startSectorID; i < totalSectors; i++) {
                dataSize += this.getSectorDataSize(i);
            }

            const data = Buffer.alloc(dataSize, format == FORMAT_TYPE.FULL ? 0xFF : 0x00);

            if (format == FORMAT_TYPE.RANDOM) {
                for (var i = 0; i < data.length; i++) {
                    data.writeUInt8(Math.floor(Math.random() * 0xFF), i);
                }
            }

            this.writeData(data, startSectorID, keyType, key, _class, writeAsUpdate)
                .then(res)
                .catch(rej);
        });
    }


    tryGetKeys(tryKeys = DEFAULT_KEYS, sectorID = 0, _class = STANDARD_CLASS) {
        return new Promise((res, rej) => {
            const dks = {
                KEY_A: null,
                KEY_B: null
            }

            var keys = tryKeys.slice();

            const startBlock = this.getStartBlock(sectorID);

            const checkKey = (keyType, key) => {
                this._mutex
                    .acquire()
                    .then(release => {
                        this.authenticate(startBlock, keyType, key)
                            .then(authed => {
                                release();
                                if (keyType == KEY_TYPE_A) {
                                    this.setKey(KEY_TYPE_A, key, sectorID);
                                    dks.KEY_A = key;
                                    keys = tryKeys.slice();
                                    checkKey(KEY_TYPE_B, keys.pop());
                                } else {
                                    this.setKey(KEY_TYPE_B, key, sectorID);
                                    dks.KEY_B = key;
                                    this.getExtraKeyData(dks, sectorID, _class)
                                        .then(res)
                                        .catch(res);
                                }
                            })
                            .catch(err => {
                                release();
                                if (err instanceof AuthenticationError && err.code == GENERAL_APDU_RESPONSE_CODES.VERIFY_FAILED) {
                                    if (keys.length > 0) {
                                        checkKey(keyType, keys.pop());
                                    } else if (keyType == KEY_TYPE_A) {
                                        keys = tryKeys.slice();
                                        checkKey(KEY_TYPE_B, keys.pop());
                                    } else {
                                        if (dks.KEY_A || dks.KEY_B) {
                                            this.getExtraKeyData(dks, sectorID, _class)
                                                .then(res)
                                                .catch(res);
                                        } else {
                                            rej('No Keys Found');
                                        }
                                    }
                                } else {
                                    rej(err);
                                }
                            });
                    });
            }

            checkKey(KEY_TYPE_A, keys.pop());
        });
    }

    tryGetAllKeys(tryKeys = DEFAULT_KEYS) {
        return new Promise((res, rej) => {
            const totalSectors = this.getTotalSectors();
            var cSector = 0, asks = {}, keys = tryKeys.slice();

            const getKeyAtSector = (sectorNum) => {
                this.tryGetKeys(keys, sectorNum)
                    .then(dks => {
                        //reorder keys if found to make checking faster
                        var keyIdx = keys.indexOf(dks.KEY_A);
                        if (keyIdx > 1) {
                            keys.splice(keyIdx, 1);
                            keys.unshift(dks.KEY_A);
                        }

                        var keyIdx = keys.indexOf(dks.KEY_B);
                        if (keyIdx > 1) {
                            keys.splice(keyIdx, 1);
                            keys.unshift(dks.KEY_B);
                        }

                        asks[cSector] = dks;

                        cSector++;
                        if (cSector < totalSectors) {
                            getKeyAtSector(cSector);
                        } else {
                            res(asks);
                        }
                    })
                    .catch(err => {
                        asks[sectorNum] = err;

                        cSector++;
                        if (cSector < totalSectors) {
                            getKeyAtSector(cSector);
                        } else {
                            res(asks);
                        }
                    });
            }

            getKeyAtSector(cSector);
        });
    }

    getExtraKeyData(dks, sectorID) {
        return new Promise((res, rej) => {
            res(dks);
        })
    }


    setKey(keyType, key, sectorID) {
        if (sectorID == null || sectorID == undefined || sectorID < 0 || sectorID >= this.getTotalSectors()) {
            throw `Invalid Sector ID ${sectorID}`;
        }

        if (!this._keyIsValid(key)) {
            throw 'Key is invalid. Must be in hex and have 12 characters';
        }

        const sectorKeys = this.getKnownSectorKeys(sectorID);

        if (keyType == KEY_TYPE_A) {
            sectorKeys.KEY_A = key;
        } else if (keyType == KEY_TYPE_B) {
            sectorKeys.KEY_B = key;
        } else {
            throw INVALID_KEY_TYPE;
        }

        this._keys[sectorID] = sectorKeys;
    }

    setKeys(keyA, keyB, sectorID = -1, access = null) {
        if (sectorID == null || sectorID == undefined || sectorID < -1 || sectorID >= this.getTotalSectors()) {
            throw `Invalid Sector ID ${sectorID}`;
        }

        if (!this._keyIsValid(keyA)) {
            throw 'Key A is invalid. Must be in hex and have 12 characters';
        }

        if (!this._keyIsValid(keyB)) {
            throw 'Key B is invalid. Must be in hex and have 12 characters';
        }

        //todo check access

        const setKeysDirect = (keyA, keyB, sid, acc) => {
            var sectorKeys = this.getKnownSectorKeys(sid);

            if (keyA)
                sectorKeys.KEY_A = keyA;
            if (keyB)
                sectorKeys.KEY_B = keyB;
            if (acc)
                sectorKeys.ACCESS = acc;

            this._keys[sid] = sectorKeys;
        }

        if (sectorID < 0) {
            const totalNumberOfSectors = this.getTotalSectors();
            for (var sid = 0; sid < totalNumberOfSectors; sid++) {
                setKeysDirect(keyA, keyB, sid, access);
            }
        } else {
            setKeysDirect(keyA, keyB, sectorID, access);
        }
    }

    setAllKeys(allKeys) {
        const setKeysfromArray = (keys, sectorID) => {
            if (!keys) {
                return;
            }

            const KEY_A = "KEY_A", KEY_B = "KEY_B";
            var keyA = null, keyB = null, access = null;

            if (Array.isArray(keys)) {
                if (keys[0] !== undefined) {
                    keyA = keys[0];

                    if (keys.length > 1) {
                        keyB = keys[1];
                    }

                    if (keys.length > 2) {
                        access = keys[2];
                    }
                }
            } else if (typeof keys === 'object') {
                if (keys[KEY_A]) {
                    keyA = keys[KEY_A];
                } else if (keys[KEY_TYPE_A]) {
                    keyA = keys[KEY_TYPE_A];
                } else if (keys[0]) {
                    keyA = keys[0];
                }

                if (keys[KEY_B]) {
                    keyB = keys[KEY_B];
                } else if (keys[KEY_TYPE_B]) {
                    keyB = keys[KEY_TYPE_B];
                } else if (keys[1]) {
                    keyB = keys[1];
                }

                if (keys['ACCESS']) {
                    access = keys['ACCESS'];
                }
            }

            if (keyA !== null && !this._keyIsValid(keyA)) {
                throw `Key A in Sector ${sectorID} is invalid`;
            }

            if (keyB !== null && !this._keyIsValid(keyB)) {
                throw `Key B in Sector ${sectorID} is invalid`;
            }

            //todo check access

            this.setKeys(keyA, keyB, sectorID, access);
        }

        const totalNumberOfSectors = this.getTotalSectors();

        if (Array.isArray(allKeys) || typeof allKeys === 'object') {
            for (var sid = 0; sid < totalNumberOfSectors; sid++) {
                setKeysfromArray(allKeys[sid], sid);
            }
        } else {
            throw 'Keys not in an Array';
        }
    }

    _keyIsValid(key) {
        const regex = /[0-9A-Fa-f]{6}/g;

        if (key == null || key.match(regex) && key.length == 12)
            return true;

        return false;
    }


    getKnownKeys() {
        var keysSelf = this._keys, keys = {};

        Object.assign(keys, keysSelf);

        return keys;
    }

    getKnownSectorKeys(sectorID) {
        if (sectorID < 0 || sectorID >= this.getTotalSectors()) {
            throw `Invalid Sector ID ${sectorID}`;
        }

        var sectorKeysSelf = this._keys[sectorID], sectorKeys = {};

        if (!sectorKeysSelf) {
            sectorKeysSelf = {
                KEY_A: null,
                KEY_B: null,
                ACCESS: null
            }
            this._keys[sectorID] = sectorKeysSelf;
        }

        Object.assign(sectorKeys, sectorKeysSelf);

        return sectorKeys;
    }

    getKeyAndTypeForAccess(block, sectorID, sectorKeys, accessType = ACCESS_TYPE.READ, accessGroup = ACCESS_GROUP.DATA) {
        var key = null, keyType = null;

        //todo check for buffer

        if (typeof sectorKeys.ACCESS != 'number') {
            if (sectorKeys.KEY_A) {
                Key = sectorKeys.KEY_A;
                KeyType = KEY_TYPE_A;
            } else if (sectorKeys.KEY_B) {
                Key = sectorKeys.KEY_B;
                KeyType = KEY_TYPE_B;
            } else {
                throw `Invalid KeyType or Key for Sector ${sectorID}`;
            }
        }

        return [key, keyType];
    }

    getDataStartBlock(sectorID) {
        if (sectorID == 0) {
            startBlockNum = 1;
        } else if (sectorID > 0 && sectorID < DEFAULT_TOTAL_SECTORS) {
            startBlockNum = sectorID * DEFAULT_BLOCKS_IN_SECTOR;
        } else {
            throw 'Invalid Sector Id';
        }
    }


    get Keys() { return this.getKnownKeys(); }

    get CardTypeId() { return this._cardTypeId; }
    get CardTypeName() { return this._cardTypeName; }

    get RID() { return this._rid; }
    get UID() { return this._uid; }
}

module.exports = {
    ISO_14443_3A_Card: ISO_14443_3A_Card
}