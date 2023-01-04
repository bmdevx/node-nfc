const EventEmitter = require('events');
const {
    Card,
    ISO_14443_3A_Card,
    ISO_14443_4_Device,
    MifareClassicCard
} = require('../cards/cards');
const {
    CARD_STANDARDS,
    CARD_TYPE_IDS,
    CARD_TYPE_NAMES,
    CARD_TYPE_AND_PART } = require('../cards/CARD_CONSTS');
const { SELECT_MODE, ZERO } = require('../cards/commands/CMD_CONSTS');

class BasicReader extends EventEmitter {

    _reader = null;
    _card = null;

    _autoProcess = false;
    _deviceHandler = null;
    _aid = null;

    constructor(reader) {
        super();

        const hasDeviceBeenRemoved = (reader, status, changes) => {
            return (changes & reader.SCARD_STATE_EMPTY) && (status.state & reader.SCARD_STATE_EMPTY);
        };

        const hasDeviceBeenDetected = (reader, status, changes) => {
            return (changes & reader.SCARD_STATE_PRESENT) && (status.state & reader.SCARD_STATE_PRESENT);
        };

        this._reader = reader;

        this._reader.on('error', err => this.emit('error', err));

        this._reader.on('status', status => {
            const changes = this._reader.state ^ status.state;

            if (hasDeviceBeenRemoved(this._reader, status, changes)) {
                this._onDeviceRemoved(this._card);
                this._card = null;
            }
            else if (hasDeviceBeenDetected(this._reader, status, changes)) {
                const atr = status.atr;
                this._onDeviceDetected(atr);
            }
        });

        this._reader.on('end', _ => this.emit('removed'));

        this._deviceHandler = this._defaultDeviceHandler;
    }

    _onDeviceDetected(atr) {
        if (atr) {
            this._card = this._createCard(atr);

            this.emit('card', this._card);

            this._card.connect()
                .then(_ => {
                    this.emit('card.connected', this._card);

                    if (this._autoProcess) {
                        this._handleDevice(this._card);
                    }
                })
                .catch('error', err => {
                    this.emit(err);
                });
        }
    }

    _onDeviceRemoved(card) {
        if (card) {
            card.disconnect()
                .catch(err => this.emit(err))
                .finally(_ => {
                    this.emit('card.removed', card);
                })
        }
    }


    _createCard(atr) {
        if (atr[5] && atr[5] === 0x4f) {
            //ISO_14443_3
            const stadardId = atr[12];
            const cardTypeId = atr.subarray(13, 15).readUInt16BE(0);
            const cardType = CARD_TYPE_NAMES[cardTypeId] != undefined ? CARD_TYPE_NAMES[cardTypeId] : 'Unknown';

            if (stadardId == CARD_TYPE_AND_PART.ISO_14443_3A) {
                switch (cardTypeId) {
                    case CARD_TYPE_IDS.Mifare_1K:
                    case CARD_TYPE_IDS.Mifare_4K:
                        return new MifareClassicCard(this._reader, atr, cardTypeId, cardType);
                    default:
                        return new ISO_14443_3A_Card(this._reader, atr, cardTypeId, cardType);
                }
            } else {
                throw 'Not implemented';
            }
        }
        else {
            //ISO_14443_4
            return new ISO_14443_4_Device(this._reader, atr);
        }
    }

    _handleDevice(card) {
        switch (card.Standard) {
            case CARD_STANDARDS.ISO_14443_3: {
                break;
            }
            case CARD_STANDARDS.ISO_14443_4: {
                if (!this.aid) {
                    this.emit('error', 'Cannot process ISO 14443-4 tag because AID was not set.');
                    return;
                }

                const aid = typeof this.aid === 'function' ? this.aid(card) : this.aid;

                if (!Buffer.isBuffer(aid)) {
                    this.emit('error', 'AID must be an instance of Buffer.');
                    return;
                }

                card.sendAid(aid, SELECT_MODE.NAME, ZERO)
                    .then(data => {
                        this.emit('card.processed', card, data);
                    })
                    .catch(err => {
                        this.emit('error', err);
                    });
                break;
            }
            default: {
                break;
            }
        }
    }

    get name() {
        return this.reader.name;
    }

    get aid() {
        return this._aid;
    }

    set aid(value) {
        if (typeof value === 'function' || Buffer.isBuffer(value)) {
            this._aid = value;
            return;
        }

        if (typeof value !== 'string') {
            throw new Error(`AID must be a HEX string or an instance of Buffer or a function.`);
        }

        this._aid = Buffer.from(value, 'hex');
    }

    set autoProcess(value) {
        this._autoProcess = value;
    }
}

module.exports = BasicReader;