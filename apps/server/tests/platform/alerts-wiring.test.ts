import { beforeEach, describe, expect, mock, test } from "bun:test";
import { privateKeyToAccount } from "viem/accounts";
import { PLATFORM_ALERT_EVENTS } from "@/lib/platform/analytics";
import {
	capturedTelegramEvents,
	clearCapturedTelegramEvents,
	flushPlatformAlerts,
	mockLoggerTelegramCapture,
} from "../support/alerts";
import { testEnvStub } from "../support/env-stub";

mockLoggerTelegramCapture();
mock.module("@/env", () => ({
	default: { ...testEnvStub, TG_ANALYTICS: true },
}));
mock.module("@/lib/domains/settlements", () => ({
	runSyncSettlementRulesJob: async () => {
		throw new Error("db unavailable");
	},
}));
mock.module("@/lib/domains/invites", () => ({
	expireAllPendingInvites: async () => {
		throw new Error("db unavailable");
	},
	inviteExpiresAt: () => new Date(),
	inviteTtlDays: () => 7,
	inviteTtlMs: () => 7 * 24 * 60 * 60 * 1000,
	pendingFileColdInviteFilter: () => ({}),
	pendingOrgInviteFilter: () => ({}),
}));

const relayerKey =
	"0x0000000000000000000000000000000000000000000000000000000000000001";
const relayerAddress = privateKeyToAccount(relayerKey).address;
const otherAddress = privateKeyToAccount(
	"0x0000000000000000000000000000000000000000000000000000000000000002",
).address;

async function resetAlertsRuntime(): Promise<void> {
	clearCapturedTelegramEvents();
	const { resetPlatformAlertsRuntimeForTests } = await import(
		"@/lib/platform/analytics"
	);
	resetPlatformAlertsRuntimeForTests();
}

describe("requestLog platform alerts", () => {
	beforeEach(resetAlertsRuntime);

	test("does not emit platform alert for 4xx responses", async () => {
		const { requestLog } = await import("@/lib/platform/pino");
		await requestLog(
			{
				req: { method: "GET", path: "/health" },
				res: { status: 404 },
			} as Parameters<typeof requestLog>[0],
			async () => {},
		);
		expect(capturedTelegramEvents).toHaveLength(0);
	});

	test("emits server.http_500 for 5xx responses", async () => {
		const { requestLog } = await import("@/lib/platform/pino");
		await requestLog(
			{
				req: { method: "POST", path: "/api/rpc" },
				res: { status: 500 },
			} as Parameters<typeof requestLog>[0],
			async () => {},
		);
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverHttp500,
		);
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			method: "POST",
			path: "/api/rpc",
			status: 500,
		});
	});
});

describe("cron platform alerts", () => {
	beforeEach(resetAlertsRuntime);

	test("sync-settlement-rules tick emits server.cron_job_failed on error", async () => {
		const { runSyncSettlementRulesCronTick } = await import(
			"@/lib/platform/cron"
		);
		await runSyncSettlementRulesCronTick();
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverCronJobFailed,
		);
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			job: "sync-settlement-rules",
			error: "db unavailable",
		});
	});

	test("expire-invites tick emits server.cron_job_failed on error", async () => {
		const { runExpireInvitesCronTick } = await import("@/lib/platform/cron");
		await runExpireInvitesCronTick();
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			job: "expire-invites",
			error: "db unavailable",
		});
	});
});

describe("handlePoolError", () => {
	beforeEach(async () => {
		clearCapturedTelegramEvents();
		mock.module("@/env", () => ({
			default: {
				TG_ANALYTICS: true,
				TG_ANALYTICS_BOT_TOKEN: "bot",
				TG_ANALYTICS_BOT_GROUP_ID: "group",
				PG_URI: "postgresql://u:p@localhost:5432/:dbname",
				DB_NAME: "test",
			},
		}));
		const { resetPlatformAlertsRuntimeForTests } = await import(
			"@/lib/platform/analytics"
		);
		resetPlatformAlertsRuntimeForTests();
	});

	test("emits server.db_infra_error for pool errors", async () => {
		const { handlePoolError } = await import("@/lib/platform/db/client");
		handlePoolError(new Error("connection terminated"));
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverDbInfraError,
		);
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			source: "pg_pool",
			error: "connection terminated",
		});
	});
});

describe("validateServerBootstrap", () => {
	beforeEach(resetAlertsRuntime);

	test("emits bootstrap alert and throws on relayer wallet mismatch", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				TG_ANALYTICS: true,
				TG_ANALYTICS_BOT_TOKEN: "bot",
				TG_ANALYTICS_BOT_GROUP_ID: "group",
				FC_SERVER_PRIVATE_KEY: relayerKey,
				FC_SERVER_ADDRESS: otherAddress,
			},
		}));
		const { validateServerBootstrap } = await import(
			"@/lib/platform/bootstrap/validate-bootstrap"
		);
		await expect(validateServerBootstrap()).rejects.toThrow(/does not match/);
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverBootstrapFailed,
		);
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			stage: "relayer_wallet_mismatch",
		});
	});

	test("emits bootstrap alert when registry server mismatches configured relayer", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				TG_ANALYTICS: true,
				TG_ANALYTICS_BOT_TOKEN: "bot",
				TG_ANALYTICS_BOT_GROUP_ID: "group",
				FC_SERVER_PRIVATE_KEY: relayerKey,
				FC_SERVER_ADDRESS: relayerAddress,
			},
		}));
		mock.module("@/lib/platform/evm", () => ({
			fsContracts: {
				FSEnvelopeRegistry: {
					read: {
						server: async () => otherAddress,
					},
				},
			},
			evmClient: { getBalance: async () => 0n },
			fsEnvelopeRegistryAt: () => ({}),
			fsPaymentValidatorAt: () => ({}),
		}));
		const { validateServerBootstrap } = await import(
			"@/lib/platform/bootstrap/validate-bootstrap"
		);
		await expect(validateServerBootstrap()).rejects.toThrow(
			/FSEnvelopeRegistry\.server\(\)/,
		);
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			stage: "registry_server_mismatch",
		});
	});

	test("passes when relayer key and registry server match configured address", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				TG_ANALYTICS: true,
				TG_ANALYTICS_BOT_TOKEN: "bot",
				TG_ANALYTICS_BOT_GROUP_ID: "group",
				FC_SERVER_PRIVATE_KEY: relayerKey,
				FC_SERVER_ADDRESS: relayerAddress,
			},
		}));
		mock.module("@/lib/platform/evm", () => ({
			fsContracts: {
				FSEnvelopeRegistry: {
					read: {
						server: async () => relayerAddress,
					},
				},
			},
			evmClient: { getBalance: async () => 0n },
			fsEnvelopeRegistryAt: () => ({}),
			fsPaymentValidatorAt: () => ({}),
		}));
		const { validateServerBootstrap } = await import(
			"@/lib/platform/bootstrap/validate-bootstrap"
		);
		await expect(validateServerBootstrap()).resolves.toBeUndefined();
	});
});

describe("monitor relayer gas", () => {
	beforeEach(resetAlertsRuntime);

	test("skips balance check on local deployment", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				DEPLOYMENT: "local",
				CHAIN: "local",
			},
		}));
		const { runMonitorRelayerGasJob } = await import(
			"@/lib/platform/cron/tasks/sync"
		);
		const result = await runMonitorRelayerGasJob();
		expect(result.checked).toBe(false);
		expect(result.alerted).toBe(false);
	});

	test("emits critical alert when production relayer balance is below threshold", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				TG_ANALYTICS: true,
				TG_ANALYTICS_BOT_TOKEN: "bot",
				TG_ANALYTICS_BOT_GROUP_ID: "group",
				DEPLOYMENT: "production",
				CHAIN: "mainnet",
			},
		}));
		mock.module("@/lib/platform/evm", () => ({
			evmClient: {
				getBalance: async () => 1n,
			},
			fsContracts: {
				FSEnvelopeRegistry: {
					read: {
						server: async () => relayerAddress,
					},
				},
			},
			fsEnvelopeRegistryAt: () => ({}),
			fsPaymentValidatorAt: () => ({}),
		}));
		const { runMonitorRelayerGasJob } = await import(
			"@/lib/platform/cron/tasks/sync"
		);
		const result = await runMonitorRelayerGasJob();
		expect(result.checked).toBe(true);
		expect(result.alerted).toBe(true);
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.serverRelayerGasLow,
		);
	});
});

describe("monitor FOC wallet balances", () => {
	beforeEach(resetAlertsRuntime);

	test("skips balance check on local deployment", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				DEPLOYMENT: "local",
				CHAIN: "local",
			},
		}));
		const { runMonitorFocWalletBalancesJob } = await import(
			"@/lib/platform/cron/tasks/sync"
		);
		const result = await runMonitorFocWalletBalancesJob();
		expect(result.checked).toBe(false);
		expect(result.filAlerted).toBe(false);
		expect(result.usdfcAlerted).toBe(false);
	});

	test("emits critical alerts when FIL and USDFC are below threshold", async () => {
		mock.module("@/env", () => ({
			default: {
				...testEnvStub,
				TG_ANALYTICS: true,
				TG_ANALYTICS_BOT_TOKEN: "bot",
				TG_ANALYTICS_BOT_GROUP_ID: "group",
				DEPLOYMENT: "production",
				CHAIN: "mainnet",
			},
		}));
		mock.module("@/lib/platform/foc/wallet-balances", () => ({
			FOC_FIL_ALERT_THRESHOLD_WEI: 50_000_000_000_000_000n,
			FOC_USDFC_ALERT_THRESHOLD_WEI: 5_000_000_000_000_000_000n,
			readFocWalletBalances: async () => ({
				filBalanceWei: 1n,
				usdfcBalanceWei: 1n,
			}),
		}));
		const { runMonitorFocWalletBalancesJob } = await import(
			"@/lib/platform/cron/tasks/sync"
		);
		const result = await runMonitorFocWalletBalancesJob();
		expect(result.checked).toBe(true);
		expect(result.filAlerted).toBe(true);
		expect(result.usdfcAlerted).toBe(true);
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(2);
		expect(capturedTelegramEvents.map((event) => event.name)).toEqual([
			PLATFORM_ALERT_EVENTS.serverFocFilLow,
			PLATFORM_ALERT_EVENTS.serverFocUsdfcLow,
		]);
	});
});

describe("settlement payout platform alerts", () => {
	beforeEach(resetAlertsRuntime);

	test("mapExecuteErrorToStatus maps insufficient funds to failed_insufficient", async () => {
		const { mapExecuteErrorToStatus } = await import(
			"@/lib/domains/settlements/utils/execute/alerts"
		);
		expect(mapExecuteErrorToStatus("insufficient balance")).toBe(
			"failed_insufficient",
		);
		expect(mapExecuteErrorToStatus("relay reverted")).toBe("failed_relay");
	});

	test("alertSettlementRelayPayoutFailed emits settlements.relay_payout_failed", async () => {
		const { alertSettlementRelayPayoutFailed } = await import(
			"@/lib/domains/settlements/utils/execute/alerts"
		);
		alertSettlementRelayPayoutFailed({
			onChainRuleId: 42n,
			pieceCid: "bafkreitest",
			status: "failed_relay",
			error: "payout_tx_reverted",
			txHash: "0xabc",
		});
		await flushPlatformAlerts();
		expect(capturedTelegramEvents).toHaveLength(1);
		expect(capturedTelegramEvents[0]?.name).toBe(
			PLATFORM_ALERT_EVENTS.settlementsRelayPayoutFailed,
		);
		expect(capturedTelegramEvents[0]?.context).toMatchObject({
			onChainRuleId: "42",
			pieceCid: "bafkreitest",
			status: "failed_relay",
			error: "payout_tx_reverted",
			txHash: "0xabc",
		});
	});
});
