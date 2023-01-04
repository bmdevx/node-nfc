const NFC = require('../src/index');
const NfcDevices = NFC.NfcDevices;

const { CARD_CONSTS } = NFC.cards.CONSTS;
const { CARD_STANDARDS } = CARD_CONSTS;

const TRY_KEYS = [
    'FFFFFFFFFFFF',
    'D3F7D3F7D3F7',
    '000000000000',
    'A0A1A2A3A4A5'
]

const SECTOR = 0;

NfcDevices.init()
    .on('device', reader => {
        reader
            .on('card', card => {
                console.log(`Card Added`);
            })
            .on('card.connected', card => {
                console.log(`Card Connected- ATR: ${card.ATR.toHexString(' ')}${card.UID ? ` - UID: ${card.UID.toHexString(' ')}` : ''}`);

                if (card.Standard === CARD_STANDARDS.ISO_14443_3) {

                    // leaving empty will automatically try the default 4 keys on sector 0.
                    card.tryGetKeys(TRY_KEYS, SECTOR)
                        .then(keys => {
                            console.log(`Keys: ${JSON.stringify(keys, null, 2)}`);
                        })
                        .catch(console.error);

                    // leaving empty will automatically try the default 4 keys on all sectors.
                    // card.tryGetAllKeys(TRY_KEYS)
                    //     .then(keys => {
                    //         console.log(`Keys: ${JSON.stringify(keys, null, 2)}`);
                    //     })
                    //     .catch(console.error);
                } else {
                    console.log('Card is not of type ISO_14443A.')
                }
            })
            .on('card.removed', card => {
                console.log(`Card Removed\n`);
            })
            .on('end', _ => {
                console.log('Reader Removed');
            })
            .on('error', err => {
                console.log(`Reader Error: ${err}`);
            });
    })
    .on('error', err => {
        console.log(`NfcDevices Error: ${err}`);
    });