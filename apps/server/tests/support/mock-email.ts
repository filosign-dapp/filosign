import { mock } from "bun:test";
import { testEnvStub } from "./env-stub";

/** Default Resend send mock; shared by email platform tests (single test file only). */
export const resendSend = mock(async () => ({
	data: { id: "re_test" },
	error: null as null,
}));

/** Default SES send mock; shared by email platform tests (single test file only). */
export const sesSend = mock(async () => ({ MessageId: "ses_test" }));

const emailTestEnv: Record<string, unknown> = { ...testEnvStub };

mock.module("resend", () => ({
	Resend: class {
		emails = { send: resendSend };
	},
}));

mock.module("@aws-sdk/client-sesv2", () => ({
	SESv2Client: class {
		send = sesSend;
	},
	SendEmailCommand: class {
		input: unknown;
		constructor(input: unknown) {
			this.input = input;
		}
	},
}));

mock.module("@/env", () => ({
	default: emailTestEnv,
}));

/** Reset transport mocks between tests (call in `beforeEach`, not `mock.restore`). */
export function resetEmailTransportMocks(): void {
	resendSend.mockClear();
	sesSend.mockClear();
	resendSend.mockImplementation(async () => ({
		data: { id: "re_test" },
		error: null,
	}));
	sesSend.mockImplementation(async () => ({ MessageId: "ses_test" }));
}

/** Apply `@/env` overrides for one test; merges onto {@link testEnvStub}. */
export function setEmailTestEnv(overrides: Record<string, unknown>): void {
	Object.assign(emailTestEnv, testEnvStub, overrides);
}

/** Default env for most email delivery tests (Resend primary). */
export function resetEmailTestEnv(): void {
	Object.assign(emailTestEnv, testEnvStub, {
		EMAIL_PROVIDER: "resend",
		RESEND_ENABLED: true,
		SES_ENABLED: false,
	});
}

/** Clear cached SDK clients after env changes. */
export async function resetEmailDeliveryClients(): Promise<void> {
	const { resetResendClientForTests, resetSesClientForTests } = await import(
		"@/lib/platform/email/email"
	);
	resetResendClientForTests();
	resetSesClientForTests();
}
