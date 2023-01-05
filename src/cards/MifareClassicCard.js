const { ISO_14443_3A_Card } = require('./ISO_14443_3A_Card');
const { CardSector } = require('./Card');
const CONSTS = require('./consts');
const { CARD_TYPE_IDS } = CONSTS.CARD_CONSTS;
const {
    BLOCK_SIZE,
    BLOCKS_IN_SMALL_SECTOR,
    BLOCKS_IN_LARGE_SECTOR,
    TOTAL_BLOCKS,

    SMALL_SECTOR_SIZE,
    LARGE_SECTOR_SIZE,
    PACKET_SIZE,

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

    getSectorSize(sectorID) {
        return MifareClassicCard.getMifareClassicSectorSize(this.CardTypeId, sectorID);
    }

    static getMifareClassicSectorSize(cardTypeId, sectorID) {
        return (cardTypeId == CARD_TYPE_IDS.Mifare_4K && sectorID >= MIFARE_4K_TOTAL_SMALL_SECTORS) ?
            LARGE_SECTOR_SIZE : SMALL_SECTOR_SIZE;
    }

    getSectorDataSize(sectorID) {
        if (this.CardTypeId == CARD_TYPE_IDS.Mifare_1K) {
            if (sectorID >= 0 && sectorID < MIFARE_1K_TOTAL_SECTORS) {
                return MIFARE_1K_SECTOR_DATA_SIZE;
            } else {
                rej('Invalid Sector Id');
            }
        } else if (this.CardTypeId == CARD_TYPE_IDS.Mifare_4K) {
            if (sectorID >= 0 && sectorID < MIFARE_4K_TOTAL_SECTORS) {
                if (sectorID >= 0 && sectorID < MIFARE_4K_TOTAL_SMALL_SECTORS) {
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