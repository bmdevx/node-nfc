const NFC = require('../src/index');
const NfcDevices = NFC.NfcDevices;
const NdefMessage = NFC.ndef.NdefMessage;

const { CARD_CONSTS } = NFC.cards.CONSTS;
const { DEFAULT_KEYS, CARD_STANDARDS } = CARD_CONSTS;

const DEFAULT_KEY = DEFAULT_KEYS[0];
const START_SECTOR = 1;
const END_SECTOR = 5;

NfcDevices.init()
    .on('device', reader => {
        reader
            .on('card', card => {
                console.log(`Card Added`);
            })
            .on('card.connected', card => {
                console.log(`Card Connected- ATR: ${card.ATR.toHexString(' ')}${card.UID ? ` - UID: ${card.UID.toHexString(' ')}` : ''}`);

                if (card.Standard === CARD_STANDARDS.ISO_14443_3) {
                    //set all B sectors with the default key
                    card.setKeys(null, DEFAULT_KEY);

                    //retreive card information
                    card.getCardInfo()
                        .then(info => {
                            console.log(`\n*Card Info*\nUID: ${info.uid.toHexString(' ')}\nBCC: ${info.bcc.toHexString(' ')}\nSAK: ${info.sak.toHexString(' ')}\nATQA: ${info.atqa.toHexString(' ')}`);


                            //read data from the selected start and end
                            card.readData(START_SECTOR, END_SECTOR)
                                .then(data => {
                                    console.log(`\nByte Data:\n${data.toHexString(' ', 16)}\n\nRecords:`);

                                    //convert buffer to ndef message
                                    const msg = NdefMessage.fromBytes(data);

                                    msg.Records.forEach(r => {
                                        console.log(r.toString());
                                    });

                                    console.log('')
                                })
                                .catch(err => {
                                    console.error(err);
                                })
                        })
                        .catch(console.error);
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