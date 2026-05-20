/**
 * Pixel size of field overlays on the add-sign canvas.
 * Recipient overlays use normalized rects derived from these dimensions + placement box size.
 */
export function signatureFieldBoxCssPx(isMobile: boolean): {
	width: number;
	height: number;
} {
	return isMobile ? { width: 100, height: 60 } : { width: 148, height: 76 };
}

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

// Mock document data
export const mockDocuments: Document[] = [
	{
		id: "1",
		name: "Contract Agreement.pdf",
		url: "/mock-document.pdf",
		pages: 3,
	},
];

// Field type configurations
export const fieldTypeConfigs = [
	{
		type: "signature" as const,
		label: "Signature",
		description: "Digital signature field",
	},
	{
		type: "initial" as const,
		label: "Initial",
		description: "Initial field",
	},
	{
		type: "date" as const,
		label: "Date Signed",
		description: "Date field",
	},
	{
		type: "name" as const,
		label: "Name",
		description: "Name field",
	},
	{
		type: "email" as const,
		label: "Email",
		description: "Email field",
	},
	{
		type: "text" as const,
		label: "Text",
		description: "Text input field",
	},
	{
		type: "checkbox" as const,
		label: "Checkbox",
		description: "Checkbox field",
	},
];
