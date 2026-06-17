export type TreasuryEip1193Provider = {
	request: (args: {
		method: string;
		params?: unknown[] | object;
	}) => Promise<unknown>;
};

export type TreasuryConnectionStatus =
	| "idle"
	| "connecting"
	| "connected"
	| "signing"
	| "polling_safe"
	| "error";
