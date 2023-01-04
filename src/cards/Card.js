const {
    CONNECT_MODE_DIRECT,
    CONNECT_MODE_CARD,

    DEFAULT_BLOCK_SIZE,
    DEFAULT_PACKET_SIZE,
    DEFAULT_SECTOR_SIZE,
    DEFAULT_BLOCKS_IN_SECTOR,
    DEFAULT_TOTAL_SECTORS
} = require('./CARD_CONSTS');
const {
    GENERAL_APDU_RESPONSES,
    GENERAL_APDU_RESPONSE_CODES,
    STANDARD_CLASS,
    SELECT_MODE
} = require('./commands/CMD_CONSTS');
const {
    ConnectError,
    DisconnectError,
    TransmitError,
    ControlError,
    ReadError,
    WriteError,
    CARD_NOT_CONNECTED,
    OPERATION_FAILED,
    FAILURE,
    INVALID_DATA_SIZE,
} = require('../errors');
const BasicCommands = require('./commands/BasicCommands');
const ApduCommand = require('../ApduCommand');


class Card {
    _atr = null;
    _standard = null;
    _reader = null;
    _connection = null;

    keyStorage = {
        '0': null,
        '1': null,
    };

    pendingLoadAuthenticationKey = {};


    constructor(reader, atr, type, standard) {
        this._reader = reader;
        this._atr = atr;
        this._type = type;
        this._standard = standard;
    }


    connect(mode = CONNECT_MODE_CARD) {
        const modes = {
            [CONNECT_MODE_DIRECT]: this._reader.SCARD_SHARE_DIRECT,
            [CONNECT_MODE_CARD]: this._reader.SCARD_SHARE_SHARED,
        };

        return new Promise((resolve, reject) => {
            if (!modes[mode]) {
                throw new ConnectError('invalid_mode', 'Invalid mode')
            }

            // connect card
            this._reader.connect({
                share_mode: modes[mode],
                //protocol: this.reader.SCARD_PROTOCOL_UNDEFINED
            }, (err, protocol) => {
                if (err) {
                    reject(new ConnectError(FAILURE, 'An error occurred while connecting.', err));
                } else {
                    this._connection = {
                        type: modes[mode],
                        protocol: protocol// !== undefined ? protocol : 2, //TODO see why it is undefined sometimes
                    };

                    resolve(this._connection);
                }
            });
        });
    }

    disconnect() {
        return new Promise((res, rej) => {
            if (!this._connection) {
                rej(new DisconnectError(CARD_NOT_CONNECTED, 'No connection. No need for disconnecting.'))
            }

            // disconnect removed
            this._reader.disconnect(this._reader.SCARD_LEAVE_CARD, (err) => {
                if (err) {
                    res(new DisconnectError(FAILURE, 'An error occurred while disconnecting.', err));
                } else {
                    this._connection = null;
                    res(true);
                }
            });
        });
    }


    transmit(data, responseLength = DEFAULT_BLOCK_SIZE) {
        if (!this._connection) {
            throw new TransmitError(CARD_NOT_CONNECTED, 'No connection available.');
        }

        return new Promise((resolve, reject) => {
            this._reader.transmit(data, responseLength, this._connection.protocol, (err, response) => {
                if (err) {
                    return reject(new TransmitError(FAILURE, 'An error occurred while transmitting.', err));
                }
                return resolve(response);
            });
        });
    }


    sendApduCommand(apdu, responseLength = 0x102) {
        return new Promise((res, rej) => {
            var data;

            if (Array.isArray(apdu)) {
                data = Buffer.from(apdu);
            } else if (typeof apdu === 'string') {
                data = Buffer.from(apdu, 'hex');
            } else if (Buffer.isBuffer(apdu)) {
                data = apdu;
            } else if (apdu instanceof ApduCommand) {
                data = apdu.bytes();
            } else {
                rej(new TypeError('Apdu must be of type ApduCommand, Buffer, string or array'));
            }

            this.transmit(data, responseLength)
                .then(res)
                .catch(rej);
        });
    }


    read(blockNumber, length, _class = STANDARD_CLASS, readInWhole = false) {
        return new Promise((res, rej) => {
            const blockSize = readInWhole ? length : this.getBlockSize(blockNumber);
            const packetSize = this.getPacketSize();

            if (!readInWhole && length > packetSize) {
                const totalBlocks = Math.ceil(length / packetSize);
                const commands = [];

                for (let i = 0; i < totalBlocks; i++) {
                    const block = blockNumber + ((i * packetSize) / blockSize);
                    const size = ((i + 1) * packetSize) < length ? packetSize : length - ((i) * packetSize);
                    commands.push(this.read(block, size, _class));
                }

                return Promise.all(commands)
                    .then(values => {
                        res(Buffer.concat(values, length));
                    })
                    .catch(err => {
                        rej(err);
                    });
            }

            // APDU CMD: Read Binary Blocks
            const packet = BasicCommands.ReadBinary(blockNumber, blockSize, _class);

            this.transmit(packet, blockSize + 2)
                .then(response => {
                    if (response.length < 2) {
                        rej(new ReadError(GENERAL_APDU_RESPONSES[36864], `Read operation failed: Invalid response length ${response.length}. Expected minimal length is 2 bytes.`));
                    } else {
                        const statusCode = response.subarray(-2).readUInt16BE(0);

                        if (statusCode !== GENERAL_APDU_RESPONSE_CODES.SUCCESSFUL) {
                            rej(new ReadError(OPERATION_FAILED, `Read operation failed: Status code: 0x${(statusCode.toString(16))}`));
                        } else {
                            res(response.subarray(0, -2));
                        }
                    }
                })
                .catch(err => {
                    rej(new ReadError(null, null, err));
                });
        });
    }

    write(blockNumber, data, _class = STANDARD_CLASS, flexBufferSize = false, padToBlock = false, writeAsUpdate = false) {
        return new Promise((res, rej) => {
            const blockSize = flexBufferSize ? data.length : this.getBlockSize(blockNumber);

            if (!flexBufferSize) {
                if (!padToBlock && (data.length < blockSize || data.length % blockSize !== 0)) {
                    rej(new WriteError(INVALID_DATA_SIZE, 'Invalid data length. You can only update the entire data block(s).'));
                }

                //write to following blocks
                if (data.length > blockSize) {
                    //pad data to size of blocks
                    if (padToBlock && data.length % blockSize !== 0) {
                        data = Buffer.concat([data], Math.ceil(data.length / blockSize) * blockSize);
                    }

                    const totalBlocks = data.length / blockSize;
                    const commands = [];

                    for (let i = 0; i < totalBlocks; i++) {
                        const block = blockNumber + i;
                        const start = i * blockSize;
                        const end = (i + 1) * blockSize;

                        const part = data.subarray(start, end);
                        commands.push(this.write(block, part, _class, false, false, writeAsUpdate));
                    }

                    return Promise.all(commands)
                        .then(values => {
                            res(values);
                        })
                        .catch(rej);
                }
            }

            // APDU CMD: Update Binary Block
            const packet = writeAsUpdate ?
                BasicCommands.UpdateBinary(blockNumber, blockSize, data, _class) :
                BasicCommands.WriteBinary(blockNumber, blockSize, data, _class);

            this.transmit(packet, blockSize + 2)
                .then(response => {
                    if (response.length < 2) {
                        rej(new WriteError(OPERATION_FAILED, `${writeAsUpdate ? "Update" : "Write"} operation failed: Invalid response length ${response.length}. Expected minimal length is 2 bytes.`));
                    }

                    const statusCode = response.subarray(-2).readUInt16BE(0);

                    if (statusCode !== GENERAL_APDU_RESPONSE_CODES.SUCCESSFUL) {
                        rej(new WriteError(OPERATION_FAILED, `${writeAsUpdate ? "Update" : "Write"}  operation failed: Status code: 0x${statusCode.toString(16)}`));
                    }

                    res(response.subarray(0, blockSize));
                })
                .catch(err => {
                    rej(new WriteError(null, null, err));
                });
        });
    }

    //use update when there is already data on a block
    update(blockNumber, data, _class = STANDARD_CLASS, flexBufferSize = false, padToBlock = false) {
        return this.write(blockNumber, data, _class, flexBufferSize, padToBlock, true);
    }


    control(data, responseMaxLength) {
        if (!this._connection) {
            throw new ControlError(CARD_NOT_CONNECTED, 'No connection available.');
        }

        return new Promise((resolve, reject) => {
            this._reader.control(data, this._reader.IOCTL_CCID_ESCAPE, responseMaxLength, (err, response) => {

                if (err) {
                    reject(new ControlError(FAILURE, 'An error occurred while transmitting control.', err));
                }

                resolve(response);
            });

        });
    }

    sendAid(aid, selectMode = SELECT_MODE.NAME, _class = STANDARD_CLASS) {
        return new Promise((res, rej) => {
            const adpu = BasicCommands.Select(aid, selectMode, _class);

            this.sendApduCommand(adpu)
                .then(result => {
                    if (result.length === 2 && result.readUInt16BE(0) === GENERAL_APDU_RESPONSE_CODES.FILE_NOT_FOUND) {
                        rej(`Invalid response. Tag not compatible with AID ${aid.toHexString()}\n${aid.toString('hex')}.`);
                    } else if (result.length < 2) {
                        rej(`Invalid response length ${result.length}. Expected minimal length is 2 bytes.`);
                    } else {
                        res(result);
                    }
                })
                .catch(rej);
        });
    }


    getTotalSectors() {
        return DEFAULT_TOTAL_SECTORS;
    }

    getBlockSize(blockNumber) {
        return DEFAULT_BLOCK_SIZE;
    }

    getStartBlock(sectorId) {
        if (sectorId >= 0 && sectorId < DEFAULT_TOTAL_SECTORS) {
            startBlockNum = sectorId * DEFAULT_BLOCKS_IN_SECTOR;
        } else {
            rej('Invalid Sector Id');
        }
    }

    getSectorSize(sectorId) {
        return DEFAULT_SECTOR_SIZE;
    }

    getSectorDataSize(sectorId) {
        return DEFAULT_SECTOR_SIZE;
    }

    getPacketSize() {
        return DEFAULT_PACKET_SIZE;
    }


    get ATR() { return this._atr; }
    get Type() { return this._type; }
    get Standard() { return this._standard; }
}


class CardSector {
    constructor(rawBytes, sectorId, startBlockNum, data) {
        this._rawBytes = rawBytes;
        this._sectorId = sectorId;
        this._startBlockNum = startBlockNum;
        this._data = data;
    }

    get RawBytes() { return this._rawBytes; }
    get SectorId() { return this._sectorId; }
    get Data() { return this._data; }
    get StartBlockNum() { return this._startBlockNum; }

    static parse(sectorId, startBlockNum, byteArr) {
        return new CardSector(
            byteArr,
            sectorId,
            startBlockNum,
            byteArr
        );
    }
}


module.exports = {
    Card: Card,
    CardSector: CardSector
};