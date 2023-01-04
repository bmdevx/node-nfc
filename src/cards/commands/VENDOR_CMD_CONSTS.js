
const INS = {
    CONTROL: 0xF0,      //Control various runtime parameters of the SpringCore coupler

    MIFARE_CLASSIC_READ: 0xF3,  //Read a Mifare Classic block or sector, with CRYPTO1 authentication
    MIFARE_CLASSIC_WRITE: 0xF4, //Write a Mifare Classic block or sector, with CRYPTO1 authentication
    MIFARE_CLASSIC_VALUE: 0xF5, //Other Mifare Classic block manipulation, with CRYPTO1 authentication

    RFID: 0xF6,     //NFC-V and other RFID-related operations
    HCE: 0xF7,      //NFC Host-based Card Emulation (HCE) operations
    SE: 0xF9,       //Secure-Elements related operations (SAM AV, AT ECC, AT AES)

    CL_CONTROL: 0xFB,   //Fine control of contactless (NFC/RFID) operation
    CT_CONTROL: 0xFB,   //Fine control of contact (ISO 7816) operation

    ECHO: 0xFD,         //Allows to test the driver with arbitrary length exchanges
    ENCAPUSLATE: 0xFE   //Send a raw frame directly to a contactless card
}




module.exports = {
    INS: INS
}