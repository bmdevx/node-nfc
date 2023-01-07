const { ISO_14443_3A_Card } = require('./ISO_14443_3A_Card');
const { CardSector } = require('./Card');
const CONSTS = require('./consts');
const { KEY_TYPE_A, KEY_TYPE_B } = require('./CARD_CONSTS');
const {
    CARD_TYPE_IDS,
    ACCESS_TYPE,
    ACCESS_GROUP
} = CONSTS.CARD_CONSTS;
const {
    ACCESS,

    BLOCK_SIZE,
    BLOCKS_IN_SMALL_SECTOR,
    BLOCKS_IN_LARGE_SECTOR,
    TOTAL_BLOCKS,

    SMALL_SECTOR_SIZE,
    LARGE_SECTOR_SIZE,
    PACKET_SIZE,

    MIFARE_MFC_SECTOR_DATA_SIZE,

    MIFARE_1K_TOTAL_SECTORS,
    MIFARE_1K_TOTAL_BLOCKS,
    MIFARE_1K_SECTOR_DATA_SIZE,

    MIFARE_4K_TOTAL_SMALL_SECTORS,
    MIFARE_4K_TOTAL_LARGE_SECTORS,
    MIFARE_4K_SMALL_SECTOR_DATA_SIZE,
    MIFARE_4K_LARGE_SECTOR_DATA_SIZE,
    MIFARE_4K_TOTAL_SECTORS,
    MIFARE_4K_TOTAL_BLOCKS
} = CONSTS.MIFARE_CLASSIC_CONSTS;

class MifareClassicCard extends ISO_14443_3A_Card {
    constructor(reader, atr, cardTypeId, cardType) {
        super(reader, atr, cardTypeId, cardType);
    }

    getKeyAndTypeForAccess(block, sectorID, sectorKeys, accessType = ACCESS_TYPE.READ, accessGroup = ACCESS_GROUP.DATA) {
        var key = null, keyType = null;

        //todo if access bits buffer
        if (typeof sectorKeys.ACCESS != 'number') {
            if (sectorKeys.KEY_A) {
                key = sectorKeys.KEY_A;
                keyType = KEY_TYPE_A;
            } else if (sectorKeys.KEY_B) {
                key = sectorKeys.KEY_B;
                keyType = KEY_TYPE_B;
            } else {
                throw `Invalid KeyType or Key for Sector ${sectorID}`;
            }
        } else {
            const blocksInSector = this.getBlocksInSector(sectorID);
            const dataBlocksInSector = blocksInSector - 1;
            const localBlock = block % blocksInSector;
            var access = null;
            var blockGroup = null;


            if (block < blocksInSector) {
                for (var i = 0; i < 3; i++) {
                    if (localBlock >= (dataBlocksInSector / 3) * i && localBlock < (dataBlocksInSector / 3 * (i + 1))) {
                        blockGroup = i;
                        break;
                    }
                }

                if (blockGroup >= 0) {
                    const blockAccessBits = this._getBlockAccessBits(sectorKeys.ACCESS, blockGroup);
                    access = ACCESS.BLOCKS.MAP[blockAccessBits][accessType];
                } else {
                    throw 'Invalid Block Group';
                }
            } else {
                blockGroup = 3;
            }

            if (accessGroup == ACCESS_GROUP.DATA) {
                const blockAccessBits = this._getBlockAccessBits(sectorKeys.ACCESS, blockGroup);
                access = ACCESS.BLOCKS.MAP[blockAccessBits][accessType];
            } else {
                const blockAccessBits = this._getBlockAccessBits(sectorKeys.ACCESS, 3);
                access = ACCESS.TRAILER.MAP[blockAccessBits][accessGroup][accessType];
            }

            if (access && access.length > 0) {
                for (const i in access) {
                    const kt = access[i];
                    if (sectorKeys[kt]) {
                        key = sectorKeys[kt];
                        keyType = kt;
                        break;
                    }
                }
            }

            if (!key) {
                throw `No Valid keys found to ${[accessType]} to block ${block}`
            }

            if (keyType == 'KEY_A') {
                keyType = KEY_TYPE_A;
            } else if (keyType == 'KEY_B') {
                keyType = KEY_TYPE_B;
            }

            return [key, keyType];
        }
    }

    getExtraKeyData(dks, sectorID, _class) {
        return new Promise((res, rej) => {
            const startBlock = this.getStartBlock(sectorID);

            const checkTrailer = (keyType, key) => {
                return new Promise((res, rej) => {
                    const trailerBlock = startBlock + this.getBlocksInSector(sectorID) - 1;

                    this.authenticate(trailerBlock, keyType, key)
                        .then(authed => {
                            const blockSize = this.getBlockSize(trailerBlock)
                            this.read(trailerBlock, blockSize, _class)
                                .then(data => {
                                    if (data && data.length == blockSize) {
                                        const accessBits = data.readUint32BE(6, 4);
                                        res(accessBits);
                                    }
                                }).catch(rej);

                        })
                        .catch(rej);
                });
            }

            this._mutex
                .acquire()
                .then(release => {
                    if (dks.KEY_A) {
                        checkTrailer(KEY_TYPE_A, dks.KEY_A)
                            .then(ab => {
                                dks.ACCESS = ab;
                                release();
                                res(dks);
                            }).catch(err => {
                                if (dks.KEY_B) {
                                    checkTrailer(KEY_TYPE_B, dks.KEY_B)
                                        .then(ab => {
                                            dks.ACCESS = ab;
                                        })
                                        .catch(err => {
                                        })
                                        .finally(_ => {
                                            release();
                                            res(dks);
                                        })
                                } else {
                                    release();
                                    res(dks);
                                }
                            });
                    } else {
                        checkTrailer(KEY_TYPE_B, dks.KEY_B)
                            .then(ab => {
                                dks.ACCESS = ab;
                            })
                            .catch(err => {
                            })
                            .finally(_ => {
                                release();
                                res(dks);
                            })
                    }
                });
        });
    }



    /*
        C[bit #, block #]
        CX3 is access bits
        Order: byte 7 [bit 4-7], byte 8 [bit 0-3], byte 8 [bit 4-7]
        Byte 6 [C23][C22][C21][C20][C13][C12][C11][C00]
        Byte 7 [C13][C12][C11][C10][C33][C32][C31][C30]
        Byte 8 [C33][C32][C31][C30][C23][C22][C21][C20]
        Byte 9 [USER DATA]
    */

    _getBlockAccessBits(accessBits, blockGroupNum) {
        var ab = 0x00;
        ab |= ((accessBits >> (20 + blockGroupNum) & 1) << 0); //c1
        ab |= ((accessBits >> (8 + blockGroupNum) & 1) << 1);  //c2
        ab |= ((accessBits >> (12 + blockGroupNum) & 1) << 2); //c3
        return ab;
    }

    getTotalSectors() {
        if (this.CardTypeId == CARD_TYPE_IDS.Mifare_1K) {
            return MIFARE_1K_TOTAL_SECTORS;
        } else {
            return MIFARE_4K_TOTAL_SECTORS
        }
    }

    getBlockSize(blockNumber) {
        return BLOCK_SIZE;
    }

    getStartBlock(sectorID) {
        return MifareClassicCard.getMifareClassicStartBlock(this.CardTypeId, sectorID);
    }

    static getMifareClassicStartBlock(cardTypeId, sectorID) {
        if (cardTypeId == CARD_TYPE_IDS.Mifare_1K) {
            if (sectorID >= 0 && sectorID < MIFARE_1K_TOTAL_SECTORS) {
                return sectorID * BLOCKS_IN_SMALL_SECTOR;
            } else {
                throw 'Invalid Sector Id';
            }
        } else if (cardTypeId == CARD_TYPE_IDS.Mifare_4K) {
            if (sectorID >= 0 && sectorID < MIFARE_4K_TOTAL_SECTORS) {
                if (sectorID >= 0 && sectorID < MIFARE_4K_TOTAL_SMALL_SECTORS) {
                    return sectorID * BLOCKS_IN_SMALL_SECTOR;
                } else {
                    return MIFARE_4K_TOTAL_SMALL_SECTORS + ((sectorID - MIFARE_4K_TOTAL_SMALL_SECTORS) * BLOCKS_IN_LARGE_SECTOR);
                }
            } else {
                throw 'Invalid Sector Id';
            }
        } else {
            throw 'Invalid Card Type';
        }
    }

    getDataStartBlock(sectorID) {
        if (sectorID == 0) {
            startBlockNum = 1;
        } else {
            return MifareClassicCard.getMifareClassicStartBlock(this.CardTypeId, sectorID);
        }
    }

    getSectorSize(sectorID) {
        return MifareClassicCard.getMifareClassicSectorSize(this.CardTypeId, sectorID);
    }

    static getMifareClassicSectorSize(cardTypeId, sectorID) {
        return (cardTypeId == CARD_TYPE_IDS.Mifare_4K && sectorID >= MIFARE_4K_TOTAL_SMALL_SECTORS) ?
            LARGE_SECTOR_SIZE : SMALL_SECTOR_SIZE;
    }

    getBlocksInSector(sectorID) {
        return (this.CardTypeId == CARD_TYPE_IDS.Mifare_4K && sectorID >= MIFARE_4K_TOTAL_SMALL_SECTORS) ?
            BLOCKS_IN_LARGE_SECTOR : BLOCKS_IN_SMALL_SECTOR;
    }

    getSectorDataSize(sectorID) {
        if (this.CardTypeId == CARD_TYPE_IDS.Mifare_1K) {
            if (sectorID == 0) {
                return MIFARE_MFC_SECTOR_DATA_SIZE;
            } else if (sectorID >= 1 && sectorID < MIFARE_1K_TOTAL_SECTORS) {
                return MIFARE_1K_SECTOR_DATA_SIZE;
            } else {
                rej('Invalid Sector Id');
            }
        } else if (this.CardTypeId == CARD_TYPE_IDS.Mifare_4K) {
            if (sectorID >= 1 && sectorID < MIFARE_4K_TOTAL_SECTORS) {
                if (sectorID >= 1 && sectorID < MIFARE_4K_TOTAL_SMALL_SECTORS) {
                    return MIFARE_4K_SMALL_SECTOR_DATA_SIZE;
                } else {
                    return MIFARE_4K_LARGE_SECTOR_DATA_SIZE;
                }
            } else {
                rej('Invalid Sector Id');
            }
        } else {
            rej('Invalid Card Type');
        }
    }

    getPacketSize() {
        return PACKET_SIZE;
    }


    parseSector(sectorID, startBlockNum, response, sectorSize) {
        return MifareClassicSector.parse(sectorID, startBlockNum, response, sectorSize == SMALL_SECTOR_SIZE)
    }


    //implement new readMifareClassicSector

    //implement new writeMifareClassicSector


    //implement valueMifareClassic

}

class MifareClassicTrailerBlock {
    constructor(keyA, access, keyB) {
        this._keyA = keyA;
        this._access = access;
        this._keyB = keyB;
    }

    get KeyA() { return this._keyA; }
    get Access() { return this._access; }
    get KeyB() { return this._keyB; }

    static create(keyA, access, keyB) {
        return new MifareClassicTrailerBlock(keyA, access, keyB);
    }

    get RawBytes() {
        return Buffer.concat(this.KeyA, this.Access, this.KeyB);
    }
}

class MifareClassicSector extends CardSector {
    constructor(rawBytes, sectorID, startBlockNum, data, trailer) {
        super(rawBytes, sectorID, startBlockNum, data);
        this._trailer = trailer;
    }

    get Trailer() { return this._trailer; }

    static parse(sectorID, startBlockNum, byteArr, isSmallSector = true) {
        return new MifareClassicSector(
            byteArr,
            sectorID,
            startBlockNum,
            isSmallSector ?
                (sectorID == 0 ? byteArr.subarray(BLOCK_SIZE, 48) : byteArr.subarray(0, 48)) :
                (byteArr.subarray(0, 241)),
            isSmallSector ?
                new MifareClassicTrailerBlock(
                    byteArr.subarray(48, 54),
                    byteArr.subarray(54, 58),
                    byteArr.subarray(58, 64)) :
                new MifareClassicTrailerBlock(
                    byteArr.subarray(241, 247),
                    byteArr.subarray(247, 251),
                    byteArr.subarray(251, 257)
                )
        );
    }

    static create(sectorID, data, trailer = null) {
        var rawBytes = null;
        const startBlockId = MifareClassicCard.getMifareClassicStartBlock(CARD_TYPE_IDS.Mifare_4K, sectorID);

        if (!(data instanceof Buffer)) {
            data = Buffer.alloc(0);
        }

        if (trailer) {
            Buffer.concat([data], (sectorID >= MIFARE_4K_TOTAL_SMALL_SECTORS ? LARGE_SECTOR_SIZE : SMALL_SECTOR_SIZE));
            const sectorSize = MifareClassicCard.getMifareClassicSectorSize(CARD_TYPE_IDS.Mifare_4K, sectorID);
            rawBytes.write(trailer.RawBytes, sectorSize - BLOCK_SIZE);
        }

        return new MifareClassicSector(
            rawBytes,
            sectorID,
            startBlockId,
            data,
            trailer);
    }
}

module.exports = {
    MifareClassicCard: MifareClassicCard,
    MifareClassicSector: MifareClassicSector,
    MifareClassicTrailerBlock: MifareClassicTrailerBlock
}