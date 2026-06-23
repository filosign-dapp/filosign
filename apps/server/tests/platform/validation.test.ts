import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { zodSafeParseMessage } from "@/lib/platform/utils/zodHttp";
import { validateDeploymentEnv } from "@/lib/platform/validate-deployment-env";
import { zIndexerTxBody } from "@/lib/platform/validation/tx-registration";

describe("validateDeploymentEnv", () => {
	test("requires PIMLICO_API_KEY when chain is not local and sponsorship is enabled", () => {
		expect(() =>
			validateDeploymentEnv({
				DEPLOYMENT: "staging",
				CHAIN: "testnet",
				DODO_API_KEY: "dodo",
				DODO_WEBHOOK_KEY: "webhook",
				PIMLICO_SPONSORSHIP_ENABLED: true,
			}),
		).toThrow("CHAIN=testnet requires PIMLICO_API_KEY");
	});

	test("allows missing PIMLICO_API_KEY on local chain", () => {
		expect(() =>
			validateDeploymentEnv({
				DEPLOYMENT: "local",
				CHAIN: "local",
				DODO_API_KEY: "dodo",
				DODO_WEBHOOK_KEY: "webhook",
			}),
		).not.toThrow();
	});

	test("allows missing FOC wallet when FOC_BACKUP_ENABLED is false", () => {
		expect(() =>
			validateDeploymentEnv({
				DEPLOYMENT: "local",
				CHAIN: "local",
				DODO_API_KEY: "dodo",
				DODO_WEBHOOK_KEY: "webhook",
				FOC_BACKUP_ENABLED: false,
			}),
		).not.toThrow();
	});

	test("requires FOC_WALLET_PRIVATE_KEY when FOC_BACKUP_ENABLED is true", () => {
		expect(() =>
			validateDeploymentEnv({
				DEPLOYMENT: "production",
				CHAIN: "mainnet",
				DODO_API_KEY: "dodo",
				DODO_WEBHOOK_KEY: "webhook",
				PIMLICO_SPONSORSHIP_ENABLED: false,
				FOC_BACKUP_ENABLED: true,
				FOC_WALLET_ADDRESS: "0x0000000000000000000000000000000000000003",
			}),
		).toThrow("FOC_BACKUP_ENABLED=true requires FOC_WALLET_PRIVATE_KEY");
	});

	test("requires FOC_WALLET_ADDRESS when FOC_BACKUP_ENABLED is true", () => {
		expect(() =>
			validateDeploymentEnv({
				DEPLOYMENT: "production",
				CHAIN: "mainnet",
				DODO_API_KEY: "dodo",
				DODO_WEBHOOK_KEY: "webhook",
				PIMLICO_SPONSORSHIP_ENABLED: false,
				FOC_BACKUP_ENABLED: true,
				FOC_WALLET_PRIVATE_KEY:
					"0x0000000000000000000000000000000000000000000000000000000000000003",
			}),
		).toThrow("FOC_BACKUP_ENABLED=true requires FOC_WALLET_ADDRESS");
	});

	test("requires FOC_BACKUP_ENABLED when FOC_RETRIEVAL is true", () => {
		expect(() =>
			validateDeploymentEnv({
				DEPLOYMENT: "local",
				CHAIN: "local",
				DODO_API_KEY: "dodo",
				DODO_WEBHOOK_KEY: "webhook",
				FOC_RETRIEVAL: true,
			}),
		).toThrow("FOC_RETRIEVAL=true requires FOC_BACKUP_ENABLED=true");
	});
});

describe("zodSafeParseMessage", () => {
	test("extracts first field issue", () => {
		const Schema = z.object({
			a: z.string().min(1),
		});
		const r = Schema.safeParse({ a: "" });
		expect(r.success).toBe(false);
		if (r.success) return;
		expect(zodSafeParseMessage(r.error).length).toBeGreaterThan(0);
	});
});

describe("zIndexerTxBody", () => {
	test("accepts empty object", () => {
		const r = zIndexerTxBody.safeParse({});
		expect(r.success).toBe(true);
	});

	test("accepts undefined", () => {
		const r = zIndexerTxBody.safeParse(undefined);
		expect(r.success).toBe(true);
	});
});
