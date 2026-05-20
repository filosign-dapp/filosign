export type SignatureField = {
	id: string;
	type:
		| "signature"
		| "initial"
		| "date"
		| "name"
		| "email"
		| "text"
		| "checkbox";
	x: number;
	y: number;
	page: number;
	documentId: string;
	/** On-platform signer wallet when known; empty for invite-only signers. */
	assignedSignerWallet: string;
	/** Signer display (from envelope recipient; not shown as raw wallet in UI). */
	assignedSignerName: string;
	assignedSignerEmail: string;
	required: boolean;
	label?: string;
};

export type Document = {
	id: string;
	name: string;
	url: string;
	pages: number;
};
