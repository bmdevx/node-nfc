//[..][7:11, RID][12, standard ID][13:14, card storage type ID]

const CONNECT_MODE_DIRECT = 'CONNECT_MODE_DIRECT';
const CONNECT_MODE_CARD = 'CONNECT_MODE_CARD';

const DEFAULT_BLOCK_SIZE = 16;
const DEFAULT_PACKET_SIZE = 16;
const DEFAULT_SECTOR_SIZE = 16;
const DEFAULT_BLOCKS_IN_SECTOR = 4;
const DEFAULT_TOTAL_SECTORS = 16;

const DEFAULT_LARGE_BLOCK_SIZE = 64;
const DEFAULT_LARGE_PACKET_SIZE = 64;
const DEFAULT_LARGE_SECTOR_SIZE = 64;

const CARD_TYPE_NAMES = {
    0x0001: 'Mifare 1K',
    0x0002: 'Mifare 4K',
    0x0003: 'Mifare Ultralight',
    0x0026: 'Mifare Mini',

    0xf004: 'Topaz and Jewel',
    0xf011: 'FeliCa 212K',
    0xf012: 'FeliCa 424K',
};

const CARD_TYPE_IDS = {
    Mifare_1K: 0x0001,
    Mifare_4K: 0x0002,
    Mifare_Ultralight: 0x0003,
    SLE55R_XXXX: 0x0004,
    SR176: 0x0006,
    SRI_X4K: 0x0007,
    AT88RF020: 0x0008,
    AT88SC0204CRF: 0x0009,
    AT88SC0808CRF: 0x000A,
    AT88SC1616CRF: 0x000B,
    AT88SC3216CRF: 0x000C,
    AT88SC6416CRF: 0x000D,
    SRF55V10P: 0x000E,
    SRF55V02P: 0x000F,
    SRF55V10S: 0x0010,
    SRF55V02S: 0x0011,
    TAG_IT: 0x0012,
    LRI512: 0x0013,
    ICODESLI: 0x0014,
    TEMPSENS: 0x0015,
    I_CODE1: 0x0016,
    PicoPass_2K: 0x0017,
    PicoPass_2KS: 0x0018,
    PicoPass_16K: 0x0019,
    PicoPass_16Ks: 0x001A,
    PicoPass_16K_8x2: 0x001B,
    PicoPass_16KS_8x2: 0x001C,
    PicoPass_32KS_16_16: 0x001D,
    PicoPass_32KS_16_8x2: 0x001E,
    PicoPass_32KS_8x2_16: 0x001F,
    PicoPass_32KS_8x2_8x2: 0x0020,
    LRI64: 0x0021,
    I_CODE_UID: 0x0022,
    I_CODE_EPC: 0x0023,
    LRI12: 0x0024,
    LRI128: 0x0025,
    Mifare_Mini: 0x0026,
    MY_D_move_SLE_66R01P: 0x0027,
    MY_D_NFC_SLE_66RxxP: 0x0028,
    MY_D_proximity_2_SLE_66RxxS: 0x0029,
    MY_D_proximity_enhanced_SLE_55RxxE: 0x002A,
    MY_D_light_SRF_55V01P: 0x002B,
    PJM_Stack_Tag_SRF_66V10ST: 0x002C,
    PJM_Item_Tag_SRF_66V10IT: 0x002D,
    PJM_Light_SRF_66V01ST: 0x002E,
    Jewel_Tag: 0x002F,
    Topaz_NFC_Tag: 0x0030,
    AT88SC0104CRF: 0x0031,
    AT88SC0404CRF: 0x0032,
    AT88RF01C: 0x0033,
    AT88RF04C: 0x0034,
    I_CODE_SL2: 0x0035,
    MIFARE_Plus_SL1_2K: 0x0036,
    MIFARE_Plus_SL1_4K: 0x0037,
    MIFARE_Plus_SL2_2K: 0x0038,
    MIFARE_Plus_SL2_4K: 0x0039,
    MIFARE_Ultralight_C: 0x003A,
    FeliCa: 0x003B,
    Melexis_Sensor_Tag_MLX90129: 0x003C,
    MIFARE_Ultralight_EV1: 0x003D,
    Topaz_and_Jewel: 0xf004,
    FeliCa_212K: 0xf011,
    FeliCa_424K: 0xf012,
};


const ISO_14443_3 = 'ISO_14443_3'; // ISO/IEC 14443-3 cards/tags
const ISO_14443_4 = 'ISO_14443_4'; // ISO/IEC 14443-4 devices
const ISO_15693 = 'ISO_15693';

const CARD_STANDARDS = {
    ISO_14443_3: ISO_14443_3,
    ISO_14443_4: ISO_14443_4,
    ISO_15693: ISO_15693
}


const CARD_TYPE_AND_PART = {
    //NFC
    ISO_14443_1A: 0x01,
    ISO_14443_2A: 0x02,
    ISO_14443_3A: 0x03,

    //Chip_(continuous_power)
    ISO_14443_1B: 0x05,
    ISO_14443_2B: 0x06,
    ISO_14443_3B: 0x07,

    ISO_15693_1: 0x09,
    ISO_15693_2: 0x0A,
    ISO_15693_3: 0x0B,
    ISO_15693_4: 0x0C,

    Contact_7816_10_I2_C: 0x0D,
    Contact_7816_10_Extended_I2_C: 0x0E,
    Contact_7816_10_2WBP: 0x0F,
    Contact_7816_10_3WBP: 0x10,

    FeliCa: 0x11,

    Low_Frequency_Contactless_Cards: 0x40,
}

const CARD_TYPE_AND_PART_NAME = {
    //NFC
    0x01: 'ISO 14443 A, part 1',
    0x02: 'ISO 14443 A, part 2',
    0x03: 'ISO 14443 A, part 3',

    //Chip (continuous power)
    0x05: 'ISO 14443 B, part 1',
    0x06: 'ISO 14443 B, part 2',
    0x07: 'ISO 14443 B, part 3',

    0x09: 'ISO 15693, part 1',
    0x0A: 'ISO 15693, part 2',
    0x0B: 'ISO 15693, part 3',
    0x0C: 'ISO 15693, part 4',

    0x0D: 'Contact (7816-10) I2 C',
    0x0E: 'Contact (7816-10) Extended I2 C',
    0x0F: 'Contact (7816-10) 2WBP',
    0x10: 'Contact (7816-10) 3WBP',

    0x11: 'FeliCa',

    0xA1: 'Low frequency contactless cards',
}


const KEY_TYPE_A = 0x60;
const KEY_TYPE_B = 0x61;

const DEFAULT_KEYS = [
    'FFFFFFFFFFFF',
    'D3F7D3F7D3F7',
    '000000000000',
    'A0A1A2A3A4A5'
]

const ACCESS_GROUP = {
    DATA: 'DATA',
    ACCESS_BITS: 'ACCESS_BITS',
    KEY_A: 'KEY_A',
    KEY_B: 'KEY_B'
}

const ACCESS_TYPE = {
    READ: 'READ',
    WRITE: 'WRITE',
    INCREMENT: 'INCREMENT',
    DTR: 'DTR'
}


const FORMAT_TYPE = {
    ZERO: 0x00,
    FULL: 0xFF,
    RANDOM: 0x0F
}

const DATA_PADDING = {
    NONE: 0,
    BLOCK: 1,
    SECTOR: 2,
    SECTOR_DATA: 3
}


module.exports = {
    CONNECT_MODE_DIRECT: CONNECT_MODE_DIRECT,
    CONNECT_MODE_CARD: CONNECT_MODE_CARD,

    DEFAULT_BLOCK_SIZE: DEFAULT_BLOCK_SIZE,
    DEFAULT_PACKET_SIZE: DEFAULT_PACKET_SIZE,
    DEFAULT_SECTOR_SIZE: DEFAULT_SECTOR_SIZE,
    DEFAULT_BLOCKS_IN_SECTOR: DEFAULT_BLOCKS_IN_SECTOR,
    DEFAULT_TOTAL_SECTORS: DEFAULT_TOTAL_SECTORS,

    DEFAULT_LARGE_BLOCK_SIZE: DEFAULT_LARGE_BLOCK_SIZE,
    DEFAULT_LARGE_PACKET_SIZE: DEFAULT_LARGE_PACKET_SIZE,
    DEFAULT_LARGE_SECTOR_SIZE: DEFAULT_LARGE_SECTOR_SIZE,

    CARD_TYPE_NAMES: CARD_TYPE_NAMES,
    CARD_TYPE_IDS: CARD_TYPE_IDS,

    CARD_STANDARDS: CARD_STANDARDS,
    CARD_TYPE_AND_PART: CARD_TYPE_AND_PART,
    CARD_TYPE_AND_PART_NAME: CARD_TYPE_AND_PART_NAME,

    KEY_TYPE_A: KEY_TYPE_A,
    KEY_TYPE_B: KEY_TYPE_B,
    DEFAULT_KEYS: DEFAULT_KEYS,

    ACCESS_TYPE: ACCESS_TYPE,
    ACCESS_GROUP,

    FORMAT_TYPE: FORMAT_TYPE,
    DATA_PADDING: DATA_PADDING
};