const { Card } = require('./Card');
const {
    CARD_STANDARDS,
    DEFAULT_LARGE_BLOCK_SIZE,
    DEFAULT_LARGE_PACKET_SIZE,
    DEFAULT_LARGE_SECTOR_SIZE
} = require('./CARD_CONSTS');

class ISO_14443_4_Device extends Card {
    constructor(reader, atr, cardTypeId) {
        super(reader, atr, cardTypeId, CARD_STANDARDS.ISO_14443_4);
    }

    getBlockSize(blockNumber) {
        return DEFAULT_LARGE_BLOCK_SIZE;
    }

    getSectorSize(sectorId) {
        return DEFAULT_LARGE_SECTOR_SIZE;
    }

    getPacketSize() {
        return DEFAULT_LARGE_PACKET_SIZE;
    }

}

module.exports = {
    ISO_14443_4_Device: ISO_14443_4_Device
}