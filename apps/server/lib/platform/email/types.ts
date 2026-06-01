export type EmailDeliveryProvider = "resend" | "ses";

export type OutboundEmail = {
	from: string;
	to: string;
	subject: string;
	html: string;
	text: string;
	replyTo?: string;
	idempotencyKey: string;
};

export type EmailDeliveryResult = {
	provider: EmailDeliveryProvider;
	id: string;
};
