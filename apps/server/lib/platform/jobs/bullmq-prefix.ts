import env from "@/env";

export function getBullmqPrefix(): string {
	return env.BULLMQ_PREFIX;
}

export const EMAIL_QUEUE_NAME = "email";
