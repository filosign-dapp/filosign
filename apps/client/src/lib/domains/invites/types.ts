export type ColdSharePackage = {
	emails: string[];
	phrase: string;
	magicLink: string;
};

export type WarmShareRecipient = {
	email: string;
	name?: string;
	role: "signer" | "viewer";
};

export type WarmShareSummary = {
	envelopeName: string;
	pieceCid: string;
	documentCount: number;
	recipients: WarmShareRecipient[];
};
