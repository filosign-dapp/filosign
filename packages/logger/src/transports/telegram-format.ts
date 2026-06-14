import os from "node:os";
import type { LoggerEvent, LoggerSeverity } from "../types";

const EVENT_TITLES: Record<string, string> = {
	"server.started": "Server started",
	"product.feedback_submitted": "User feedback",
	"server.http_500": "HTTP 500",
	"server.cron_job_failed": "Cron job failed",
	"server.bootstrap_failed": "Bootstrap failed",
	"server.db_infra_error": "Database error",
	"server.relayer_gas_low": "Relayer gas low",
	"server.foc_fil_low": "FOC FIL balance low",
	"server.foc_usdfc_low": "FOC USDFC balance low",
	"server.rpc_degraded": "RPC degraded",
	"settlements.relay_payout_failed": "Settlement payout failed",
	"server.pgbackrest_failed": "pgBackRest backup failed",
	"server.bullmq_job_failed": "Background job failed",
	"server.worker_stale": "Worker offline",
	"billing.webhook_stuck": "Billing webhooks stuck",
	"email.outbox_stuck": "Email outbox stuck",
	"billing.subscription_problem": "Subscription payment issue",
	"server.email_disabled": "Email delivery disabled",
};

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

function ctxString(
	context: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const value = context?.[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function ctxNumber(
	context: Record<string, unknown> | undefined,
	key: string,
): number | undefined {
	const value = context?.[key];
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function ctxBoolean(
	context: Record<string, unknown> | undefined,
	key: string,
): boolean | undefined {
	const value = context?.[key];
	return typeof value === "boolean" ? value : undefined;
}

function shortAddress(value: string): string {
	if (!value.startsWith("0x") || value.length <= 12) {
		return value;
	}
	return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function formatTimestamp(timestamp: number | undefined): string {
	const date = new Date(timestamp ?? Date.now());
	return date.toLocaleString("en-GB", {
		timeZone: "UTC",
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function formatDetailLines(
	lines: Array<[label: string, value: string | number | boolean | null | undefined]>,
): string[] {
	const formatted: string[] = [];
	for (const [label, value] of lines) {
		if (value == null || value === "") continue;
		formatted.push(`${label}: ${escapeHtml(String(value))}`);
	}
	return formatted;
}

function severityPrefix(severity: LoggerSeverity): string | null {
	if (severity === "critical") return "CRITICAL";
	if (severity === "error") return "ERROR";
	if (severity === "warn") return "WARNING";
	return null;
}

function formatTitle(event: LoggerEvent): string {
	const label = EVENT_TITLES[event.name] ?? event.name.replaceAll(".", " · ");
	const prefix = severityPrefix(event.severity);
	return prefix ? `${prefix} · ${label}` : label;
}

function formatServerStarted(event: LoggerEvent): string {
	const context = event.context;
	return [
		`<b>${escapeHtml(formatTitle(event))}</b>`,
		escapeHtml(event.message),
		...formatDetailLines([
			["Deployment", ctxString(context, "deployment")],
			["Chain", ctxString(context, "chain")],
			["Role", ctxString(context, "serverRole")],
			["Host", ctxString(context, "hostname") ?? os.hostname()],
			["Time (UTC)", formatTimestamp(event.timestamp)],
		]),
	].join("\n");
}

function feedbackKindTitle(kind: string | undefined): string {
	switch (kind) {
		case "bug":
			return "Bug report";
		case "support":
			return "Support request";
		case "feedback":
			return EVENT_TITLES["product.feedback_submitted"] ?? "User feedback";
		default:
			return EVENT_TITLES["product.feedback_submitted"] ?? "User feedback";
	}
}

function feedbackKindTypeLabel(kind: string | undefined): string | undefined {
	switch (kind) {
		case "bug":
			return "Bug report";
		case "support":
			return "Support ticket";
		case "feedback":
			return "Feedback";
		default:
			return kind;
	}
}

function formatProductFeedback(event: LoggerEvent): string {
	const context = event.context;
	const kind = ctxString(context, "kind");
	const wallet = ctxString(context, "wallet");
	const notes = ctxString(context, "message");

	return [
		`<b>${escapeHtml(feedbackKindTitle(kind))}</b>`,
		...formatDetailLines([
			["Type", feedbackKindTypeLabel(kind)],
			["Area", ctxString(context, "featureArea")],
			["Prompt", ctxString(context, "promptType")],
			["Wallet", wallet ? shortAddress(wallet) : undefined],
			["Route", ctxString(context, "route")],
			["Trigger", ctxString(context, "trigger")],
			["Piece", ctxString(context, "pieceCid")],
			["Org", ctxString(context, "organizationId")],
		]),
		notes ? `\nNotes:\n${escapeHtml(notes)}` : "",
		`\nTime (UTC): ${escapeHtml(formatTimestamp(event.timestamp))}`,
	]
		.filter((line) => line.length > 0)
		.join("\n");
}

function formatHttp500(event: LoggerEvent): string {
	const context = event.context;
	const durationMs = ctxNumber(context, "durationMs");
	return [
		`<b>${escapeHtml(formatTitle(event))}</b>`,
		escapeHtml(event.message),
		...formatDetailLines([
			[
				"Request",
				ctxString(context, "method") && ctxString(context, "path")
					? `${ctxString(context, "method")} ${ctxString(context, "path")}`
					: undefined,
			],
			["Status", ctxNumber(context, "status")],
			["Duration", durationMs != null ? `${durationMs} ms` : undefined],
		]),
		`\nTime (UTC): ${escapeHtml(formatTimestamp(event.timestamp))}`,
	].join("\n");
}

function formatErrorContext(event: LoggerEvent, detailKeys: string[]): string {
	const context = event.context;
	const lines = formatDetailLines(
		detailKeys.map((key) => {
			const label = key.charAt(0).toUpperCase() + key.slice(1);
			return [label, ctxString(context, key)] as const;
		}),
	);

	return [
		`<b>${escapeHtml(formatTitle(event))}</b>`,
		escapeHtml(event.message),
		...lines,
		`\nTime (UTC): ${escapeHtml(formatTimestamp(event.timestamp))}`,
	].join("\n");
}

function formatBalanceAlert(event: LoggerEvent): string {
	const context = event.context;
	const token = ctxString(context, "token");
	const wallet = ctxString(context, "wallet");

	return [
		`<b>${escapeHtml(formatTitle(event))}</b>`,
		escapeHtml(event.message),
		...formatDetailLines([
			["Token", token],
			["Wallet", wallet ? shortAddress(wallet) : undefined],
			["Balance (wei)", ctxString(context, "balanceWei")],
			["Threshold (wei)", ctxString(context, "thresholdWei")],
			["Deployment", ctxString(context, "deployment")],
			["Chain", ctxString(context, "chain")],
		]),
		`\nTime (UTC): ${escapeHtml(formatTimestamp(event.timestamp))}`,
	].join("\n");
}

function formatRpcDegraded(event: LoggerEvent): string {
	const context = event.context;
	const fallbackEnabled = ctxBoolean(context, "fallbackEnabled");

	return [
		`<b>${escapeHtml(formatTitle(event))}</b>`,
		escapeHtml(event.message),
		...formatDetailLines([
			["Chain", ctxString(context, "chainKey")],
			["RPC", ctxString(context, "rpcUrl")],
			[
				"Fallback",
				fallbackEnabled == null ? undefined : fallbackEnabled ? "enabled" : "disabled",
			],
			["Error", ctxString(context, "error")],
		]),
		`\nTime (UTC): ${escapeHtml(formatTimestamp(event.timestamp))}`,
	].join("\n");
}

function formatSettlementPayoutFailed(event: LoggerEvent): string {
	const context = event.context;
	return [
		`<b>${escapeHtml(formatTitle(event))}</b>`,
		escapeHtml(event.message),
		...formatDetailLines([
			["Rule", ctxString(context, "onChainRuleId")],
			["Status", ctxString(context, "status")],
			["Piece", ctxString(context, "pieceCid")],
			["Tx", ctxString(context, "txHash")],
			["Error", ctxString(context, "error")],
		]),
		`\nTime (UTC): ${escapeHtml(formatTimestamp(event.timestamp))}`,
	].join("\n");
}

function formatGeneric(event: LoggerEvent): string {
	const context = event.context;
	const detailLines =
		context == null
			? []
			: formatDetailLines(
					Object.entries(context).map(([key, value]) => {
						const label = key.charAt(0).toUpperCase() + key.slice(1);
						if (
							typeof value === "string" ||
							typeof value === "number" ||
							typeof value === "boolean"
						) {
							return [label, value] as const;
						}
						return [label, JSON.stringify(value)] as const;
					}),
				);

	return [
		`<b>${escapeHtml(formatTitle(event))}</b>`,
		escapeHtml(event.message),
		...detailLines,
		`\nTime (UTC): ${escapeHtml(formatTimestamp(event.timestamp))}`,
	].join("\n");
}

export function formatTelegramMessage(event: LoggerEvent): string {
	switch (event.name) {
		case "server.started":
			return formatServerStarted(event);
		case "product.feedback_submitted":
			return formatProductFeedback(event);
		case "server.http_500":
			return formatHttp500(event);
		case "server.cron_job_failed":
			return formatErrorContext(event, ["job", "error"]);
		case "server.bootstrap_failed":
			return formatErrorContext(event, ["stage", "error"]);
		case "server.db_infra_error":
			return formatErrorContext(event, ["source", "error"]);
		case "server.relayer_gas_low":
		case "server.foc_fil_low":
		case "server.foc_usdfc_low":
			return formatBalanceAlert(event);
		case "server.rpc_degraded":
			return formatRpcDegraded(event);
		case "settlements.relay_payout_failed":
			return formatSettlementPayoutFailed(event);
		case "server.pgbackrest_failed":
			return formatErrorContext(event, ["stanza", "container", "cmd"]);
		case "server.bullmq_job_failed":
			return formatErrorContext(event, ["queueName", "jobId", "outboxId", "error"]);
		case "server.worker_stale":
			return formatErrorContext(event, [
				"lastHeartbeatAt",
				"staleForSec",
				"deployment",
				"serverRole",
			]);
		case "billing.webhook_stuck":
			return formatErrorContext(event, [
				"receivedCount",
				"failedCount",
				"oldestReceivedAgeMin",
				"reEnqueued",
			]);
		case "email.outbox_stuck":
			return formatErrorContext(event, ["count", "oldestAgeMin"]);
		case "billing.subscription_problem":
			return formatErrorContext(event, [
				"eventType",
				"organizationId",
				"subscriptionId",
				"customerEmail",
			]);
		case "server.email_disabled":
			return formatErrorContext(event, [
				"deployment",
				"resendEnabled",
				"sesEnabled",
			]);
		default:
			return formatGeneric(event);
	}
}
