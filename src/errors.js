module.exports.UNKNOWN_ERROR = 'Unknown Error';
module.exports.FAILURE = 'Failure';
module.exports.CARD_NOT_CONNECTED = 'Card Not Connected';
module.exports.OPERATION_FAILED = 'Operation Failed';
module.exports.INVALID_RESPONSE = 'Invalid Response';
module.exports.INVALID_KEY = 'Invalid Key';
module.exports.INVALID_KEY_TYPE = 'Invalid KeyType';
module.exports.INVALID_KEY_OR_KEY_TYPE = 'Invalid Key or KeyType';
module.exports.INVALID_DATA_SIZE = 'Invalid Data Size';

class BaseError extends Error {
	constructor(code, message, previousError) {
		super(message);

		//Error.captureStackTrace(this, this.constructor);

		this.name = 'BaseError';

		if (!message && previousError) {
			this.message = previousError.message;
		}

		this.code = code;

		if (previousError) {
			this.previous = previousError;
		}
	}

	toString() {
		return `[${this.name}] ${this.code}: ${this.message}`;
	}
}

module.exports.BaseError = BaseError;

class TransmitError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'TransmitError';
	}
}
module.exports.TransmitError = TransmitError;


class ControlError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'ControlError';
	}
}
module.exports.ControlError = ControlError;


class ReadError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'ReadError';
	}
}
module.exports.ReadError = ReadError;


class WriteError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'WriteError';
	}
}
module.exports.WriteError = WriteError;

class LoadAuthenticationKeyError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'LoadAuthenticationKeyError';
	}
}
module.exports.LoadAuthenticationKeyError = LoadAuthenticationKeyError;


class AuthenticationError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'AuthenticationError';
	}
}
module.exports.AuthenticationError = AuthenticationError;


class ConnectError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'ConnectError';
	}
}
module.exports.ConnectError = ConnectError;


class DisconnectError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'DisconnectError';
	}
}
module.exports.DisconnectError = DisconnectError;


class GetUIDError extends BaseError {
	constructor(code, message, previousError) {
		super(code, message, previousError);
		this.name = 'GetUIDError';
	}
}
module.exports.GetUIDError = GetUIDError;
