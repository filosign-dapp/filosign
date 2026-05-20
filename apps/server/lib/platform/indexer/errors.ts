import type {
	ClientErrorStatusCode,
	ServerErrorStatusCode,
} from "hono/utils/http-status";

/** Mapped to **`ORPCError`** in `tx.processIndexerHash`; avoids leaking indexer internals */
export class ProcessTxUserError extends Error {
	readonly httpStatus: ClientErrorStatusCode | ServerErrorStatusCode;

	constructor(
		message: string,
		httpStatus: ClientErrorStatusCode | ServerErrorStatusCode = 400,
	) {
		super(message);
		this.name = "ProcessTxUserError";
		this.httpStatus = httpStatus;
	}
}
