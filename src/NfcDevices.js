const EventEmitter = require('events');
const pcsclite = require('@aaroncheung430/pcsclite');
const {
    BasicReader,
    ACR_Reader,
    ACR122_Reader,
    ACR125_Reader
} = require('./readers/readers')

class NfcDevices extends EventEmitter {
    _pcsc = null;

    get Readers() { return this._pcsc.readers; }

    constructor() {
        super();

        this._pcsc = pcsclite();

        this._pcsc
            .on('reader', reader => {
                const deviceName = reader.name.toLowerCase();
                var device;

                if (deviceName.includes('acr')) {
                    device = this._getACR_Reader(deviceName, reader);
                } else {
                    device = new BasicReader(reader);
                }

                this.emit('device', device);
            })
            .on('error', err => {
                this.emit('error', err);
            });
    }

    close() {
        try {
            this._pcsc.removeAllListeners();
            this._pcsc.close();
        } finally {
            this._pcsc = null;
        }
    }

    static close() {
        if (NfcDevices._instance) {
            NfcDevices._instance.close();
            NfcDevices._instance = null;
        } else {
            throw 'Not Initialzied';
        }
    }

    static init() {
        if (NfcDevices._instance) throw 'Already Initialized';

        NfcDevices._instance = new NfcDevices();
        return NfcDevices._instance;
    }

    _getACR_Reader(deviceName, reader) {
        if (deviceName.includes('acr122')) {
            return new ACR122_Reader(reader);
        } else if (deviceName.includes('acr125')) {
            return new ACR125_Reader(reader);
        } else {
            return new ACR_Reader(reader);
        }
    }
}

module.exports = NfcDevices;