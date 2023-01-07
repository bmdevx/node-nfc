const BLOCK_SIZE = 16;
const BLOCKS_IN_SMALL_SECTOR = 4;
const BLOCKS_IN_LARGE_SECTOR = 16;
const SMALL_SECTOR_SIZE = BLOCK_SIZE * BLOCKS_IN_SMALL_SECTOR;
const LARGE_SECTOR_SIZE = BLOCK_SIZE * BLOCKS_IN_LARGE_SECTOR;
const PACKET_SIZE = 16;

const MIFARE_MFC_SECTOR_DATA_SIZE = BLOCK_SIZE * 2;

const MIFARE_1K_TOTAL_SECTORS = 16;
const MIFARE_1K_TOTAL_BLOCKS = BLOCKS_IN_SMALL_SECTOR * MIFARE_1K_TOTAL_SECTORS;
const MIFARE_1K_SECTOR_DATA_SIZE = BLOCK_SIZE * (BLOCKS_IN_SMALL_SECTOR - 1);

const MIFARE_4K_TOTAL_SMALL_SECTORS = 32;
const MIFARE_4K_TOTAL_LARGE_SECTORS = 8;
const MIFARE_4K_SMALL_SECTOR_DATA_SIZE = BLOCK_SIZE * (BLOCKS_IN_SMALL_SECTOR - 1);
const MIFARE_4K_LARGE_SECTOR_DATA_SIZE = BLOCK_SIZE * (BLOCKS_IN_LARGE_SECTOR - 1);
const MIFARE_4K_TOTAL_SECTORS = MIFARE_4K_TOTAL_SMALL_SECTORS + MIFARE_4K_TOTAL_LARGE_SECTORS;
const MIFARE_4K_TOTAL_BLOCKS = BLOCKS_IN_SMALL_SECTOR * MIFARE_4K_TOTAL_SMALL_SECTORS + BLOCKS_IN_LARGE_SECTOR * MIFARE_4K_TOTAL_LARGE_SECTORS;


const KEY_A = 'KEY_A';
const KEY_B = 'KEY_B';
const READ = 'READ';
const WRITE = 'WRITE';
const INCREMENT = 'INCREMENT';
const DTR = 'DTR';

const DEFAULT_ACCESS = 0x7F078840;
const DEFAULT_MFC_ACCESS = 0x787788C1;


const ACCESS = {
    'BLOCKS': {
        'CODES': {
            'rABwABiABdtrAB_tc': 0b000,
            'rAB': 0b010,
            'rABwB': 0b100,
            'rABwBiBdtrAB': 0b110,
            'rABdtrAB': 0b001,
            'rBwB': 0b011,
            'rB': 0b101,
            'NONE': 0b111
        },
        'MAP': {
            0x00: {
                READ: [KEY_A, KEY_B],
                WRITE: [KEY_A, KEY_B],
                INCREMENT: [KEY_A, KEY_B],
                DTR: [KEY_A, KEY_B]
            },
            0x02: {
                READ: [KEY_A, KEY_B],
                WRITE: [],
                INCREMENT: [],
                DTR: []
            },
            0x04: {
                READ: [KEY_A, KEY_B],
                WRITE: [KEY_B],
                INCREMENT: [],
                DTR: []
            },
            0x06: {
                READ: [KEY_A, KEY_B],
                WRITE: [KEY_B],
                INCREMENT: [KEY_B],
                DTR: [KEY_A, KEY_B]
            },
            0x01: {
                READ: [KEY_A, KEY_B],
                WRITE: [],
                INCREMENT: [],
                DTR: [KEY_A, KEY_B]
            },
            0x03: {
                READ: [KEY_B],
                WRITE: [KEY_B],
                INCREMENT: [],
                DTR: []
            },
            0x05: {
                READ: [KEY_B],
                WRITE: [],
                INCREMENT: [],
                DTR: []
            },
            0x07: {
                READ: [],
                WRITE: [],
                INCREMENT: [],
                DTR: []
            }
        }
    },
    'TRAILER': {
        'CODES': {
            //KEYA WRITE (A/B), ACCESS BITS READ (A/B) WRITE (A/B), KEYB READ (A/B) WRITe (A/B), transport config
            'KAwA_ABrA_KBrAwA_tc': 0b000,
            'KA_ABrA_KBrA_tc': 0b010,
            'kAwB_ABrAB_KBwB': 0b100,
            'KA_ABrAB_KB': 0b110,
            'KAwA_ABrAwA_KBrAwA_tc': 0b001,
            'KAwB_ABrABwB_KBwB': 0b011,
            'KA_ABrABwB_KB': 0b101,
            'KA_ABrAB_KB': 0b111
        },
        'MAP': {
            0x00: {
                KEY_A: {
                    READ: [],
                    WRITE: [KEY_A]
                },
                ACCESS_BITS: {
                    READ: [KEY_A],
                    WRITE: []
                },
                KEY_B: {
                    READ: [KEY_A],
                    WRITE: [KEY_A]
                }
            },
            0x02: {
                KEY_A: {
                    READ: [],
                    WRITE: []
                },
                ACCESS_BITS: {
                    READ: [KEY_A],
                    WRITE: []
                },
                KEY_B: {
                    READ: [KEY_A],
                    WRITE: []
                }
            },
            0x04: {
                KEY_A: {
                    READ: [],
                    WRITE: [KEY_B]
                },
                ACCESS_BITS: {
                    READ: [KEY_A, KEY_B],
                    WRITE: []
                },
                KEY_B: {
                    READ: [],
                    WRITE: [KEY_B]
                }
            },
            0x06: {
                KEY_A: {
                    READ: [],
                    WRITE: []
                },
                ACCESS_BITS: {
                    READ: [KEY_A, KEY_B],
                    WRITE: []
                },
                KEY_B: {
                    READ: [],
                    WRITE: []
                }
            },
            0x01: {
                KEY_A: {
                    READ: [],
                    WRITE: [KEY_A]
                },
                ACCESS_BITS: {
                    READ: [KEY_A],
                    WRITE: [KEY_A]
                },
                KEY_B: {
                    READ: [KEY_A],
                    WRITE: [KEY_A]
                }
            },
            0x03: {
                KEY_A: {
                    READ: [],
                    WRITE: [KEY_B]
                },
                ACCESS_BITS: {
                    READ: [KEY_A, KEY_B],
                    WRITE: [KEY_B]
                },
                KEY_B: {
                    READ: [],
                    WRITE: [KEY_B]
                }
            },
            0x05: {
                KEY_A: {
                    READ: [],
                    WRITE: []
                },
                ACCESS_BITS: {
                    READ: [KEY_A, KEY_B],
                    WRITE: [KEY_B]
                },
                KEY_B: {
                    READ: [],
                    WRITE: []
                }
            },
            0x07: {
                KEY_A: {
                    READ: [],
                    WRITE: []
                },
                ACCESS_BITS: {
                    READ: [KEY_A, KEY_B],
                    WRITE: []
                },
                KEY_B: {
                    READ: [],
                    WRITE: []
                }
            }
        }
    }
}

module.exports = {
    BLOCK_SIZE: BLOCK_SIZE,
    BLOCKS_IN_SMALL_SECTOR: BLOCKS_IN_SMALL_SECTOR,
    BLOCKS_IN_LARGE_SECTOR: BLOCKS_IN_LARGE_SECTOR,

    SMALL_SECTOR_SIZE: SMALL_SECTOR_SIZE,
    LARGE_SECTOR_SIZE: LARGE_SECTOR_SIZE,
    PACKET_SIZE: PACKET_SIZE,

    MIFARE_MFC_SECTOR_DATA_SIZE: MIFARE_MFC_SECTOR_DATA_SIZE,

    MIFARE_1K_TOTAL_SECTORS: MIFARE_1K_TOTAL_SECTORS,
    MIFARE_1K_TOTAL_BLOCKS: MIFARE_1K_TOTAL_BLOCKS,
    MIFARE_1K_SECTOR_DATA_SIZE: MIFARE_1K_SECTOR_DATA_SIZE,

    MIFARE_4K_TOTAL_SMALL_SECTORS: MIFARE_4K_TOTAL_SMALL_SECTORS,
    MIFARE_4K_TOTAL_LARGE_SECTORS: MIFARE_4K_TOTAL_LARGE_SECTORS,
    MIFARE_4K_SMALL_SECTOR_DATA_SIZE: MIFARE_4K_SMALL_SECTOR_DATA_SIZE,
    MIFARE_4K_LARGE_SECTOR_DATA_SIZE: MIFARE_4K_LARGE_SECTOR_DATA_SIZE,
    MIFARE_4K_TOTAL_SECTORS: MIFARE_4K_TOTAL_SECTORS,
    MIFARE_4K_TOTAL_BLOCKS: MIFARE_4K_TOTAL_BLOCKS,

    ACCESS: ACCESS,
    DEFAULT_ACCESS: DEFAULT_ACCESS,
    DEFAULT_MFC_ACCESS: DEFAULT_MFC_ACCESS
}