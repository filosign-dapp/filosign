import os from "node:os";
import type { LoggerEvent, LoggerSeverity } from "../types";
import { readCtxBoolean, readCtxNumber, readCtxString } from "../utils/context";
import { formatWeiWithSymbol, truncateEvmAddress } from "../utils/display";
import { escapeHtml } from "../utils/html";

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
	"platform.access_request_submitted": "Platform access request",
	"platform.payout_access_request_submitted": "Payout access request",
	"platform.partner_invite_redeemed": "Partner invite redeemed",
};

const FEEDBACK_KIND_LABELS = {
	bug: { title: "Bug report", type: "Bug report" },
	support: { title: "Support request", type: "Support ticket" },
	feedback: { title: "User feedback", type: "Feedback" },
} as const;

type DetailEntry = readonly [
	label: string,
	value: string | number | boolean | null | undefined,
];

function formatTimestamp(timestamp: number | undefined): string {
	const date = new Date(timestamp ?? Date.now());
	return date.toLocaleString("en-GB", {
		timeZone: "UTC",
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function formatDetailLines(lines: DetailEntry[]): string[] {
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

function utcTimestampFooter(timestamp: number | undefined): string {
	return `\nTime (UTC): ${escapeHtml(formatTimestamp(timestamp))}`;
}

function buildTelegramBlock(options: {
	title: string;
	message?: string;
	details?: DetailEntry[];
	timestamp?: number;
	notes?: string;
}): string {
	return [
		`<b>${escapeHtml(options.title)}</b>`,
		options.message ? escapeHtml(options.message) : "",
		...formatDetailLines(options.details ?? []),
		options.notes ? `\nNotes:\n${escapeHtml(options.notes)}` : "",
		utcTimestampFooter(options.timestamp),
	]
		.filter((line) => line.length > 0)
		.join("\n");
}

function feedbackLabels(kind: string | undefined) {
	const labels =
		kind != null && kind in FEEDBACK_KIND_LABELS
			? FEEDBACK_KIND_LABELS[kind as keyof typeof FEEDBACK_KIND_LABELS]
			: FEEDBACK_KIND_LABELS.feedback;
	return {
		title: labels.title,
		type: labels.type,
	};
}

function formatServerStarted(event: LoggerEvent): string {
	const context = event.context;
	return [
		`<b>${escapeHtml(formatTitle(event))}</b>`,
		escapeHtml(event.message),
		...formatDetailLines([
			["Deployment", readCtxString(context, "deployment")],
			["Chain", readCtxString(context, "chain")],
			["Role", readCtxString(context, "serverRole")],
			["Host", readCtxString(context, "hostname") ?? os.hostname()],
			["Time (UTC)", formatTimestamp(event.timestamp)],
		]),
	].join("\n");
}

function formatProductFeedback(event: LoggerEvent): string {
	const context = event.context;
	const kind = readCtxString(context, "kind");
	const wallet = readCtxString(context, "wallet");
	const { title, type } = feedbackLabels(kind);

	return buildTelegramBlock({
		title,
		details: [
			["Type", type],
			["Area", readCtxString(context, "featureArea")],
			["Prompt", readCtxString(context, "promptType")],
			["Wallet", wallet ? truncateEvmAddress(wallet) : undefined],
			["Route", readCtxString(context, "route")],
			["Trigger", readCtxString(context, "trigger")],
			["Piece", readCtxString(context, "pieceCid")],
			["Org", readCtxString(context, "organizationId")],
		],
		notes: readCtxString(context, "message"),
		timestamp: event.timestamp,
	});
}

function formatPlanLabel(planId: string | undefined): string | undefined {
	if (!planId) return undefined;
	return planId
		.split("_")
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function formatPlatformAccessRequest(event: LoggerEvent): string {
	const context = event.context;
	const planId = readCtxString(context, "planId");
	const billingInterval = readCtxString(context, "billingInterval");
	const seatCount = readCtxNumber(context, "seatCount");
	const planParts = [
		formatPlanLabel(planId),
		billingInterval,
		seatCount != null ? `${seatCount} seats` : undefined,
	].filter(Boolean);

	return buildTelegramBlock({
		title: formatTitle(event),
		details: [
			["Plan", planParts.length > 0 ? planParts.join(" · ") : undefined],
			["Email", readCtxString(context, "email")],
			["Name", readCtxString(context, "name")],
			["Company", readCtxString(context, "company")],
			["Review", readCtxString(context, "adminPath")],
		],
		notes: readCtxString(context, "message"),
		timestamp: event.timestamp,
	});
}

function formatPayoutAccessRequest(event: LoggerEvent): string {
	const context = event.context;
	const wallet = readCtxString(context, "wallet");
	const country = readCtxString(context, "organizationCountry");
	const legalName = readCtxString(context, "organizationLegalName");
	const organization =
		legalName && country ? `${legalName} (${country})` : (legalName ?? country);
	const requesterName = readCtxString(context, "requesterName");
	const requesterRole = readCtxString(context, "requesterRole");
	const requester =
		requesterName && requesterRole
			? `${requesterName} · ${requesterRole}`
			: (requesterName ?? requesterRole);
	const externalRequested = readCtxBoolean(
		context,
		"externalWalletAccessRequested",
	);

	const details: DetailEntry[] = [
		["Organization", organization],
		["Requester", requester],
		["Wallet", wallet ? truncateEvmAddress(wallet) : undefined],
		["Org ID", readCtxString(context, "organizationId")],
		["Review", readCtxString(context, "adminPath")],
	];

	if (externalRequested === true) {
		details.push(["External wallets", "Requested"]);
	}

	const useCase = readCtxString(context, "useCase");
	const externalUseCase = readCtxString(context, "externalWalletUseCase");
	const notes = [
		useCase ? `Use case:\n${useCase}` : null,
		externalUseCase ? `External use case:\n${externalUseCase}` : null,
	]
		.filter(Boolean)
		.join("\n\n");

	return buildTelegramBlock({
		title: formatTitle(event),
		details,
		notes: notes || undefined,
		timestamp: event.timestamp,
	});
}

function formatPartnerInviteRedeemed(event: LoggerEvent): string {
	const context = event.context;
	const wallet = readCtxString(context, "wallet");
	const planId = readCtxString(context, "planId");
	const trialDays = readCtxNumber(context, "trialDays");
	const inviteKind = readCtxString(context, "inviteKind");
	const emailVariant = readCtxString(context, "emailVariant");
	const inviteLabel = [inviteKind, emailVariant].filter(Boolean).join(" · ");

	return buildTelegramBlock({
		title: formatTitle(event),
		details: [
			["Email", readCtxString(context, "email")],
			["Wallet", wallet ? truncateEvmAddress(wallet) : undefined],
			[
				"Plan",
				[
					formatPlanLabel(planId) ?? planId,
					trialDays != null ? `${trialDays}-day trial` : undefined,
				]
					.filter(Boolean)
					.join(" · "),
			],
			["Invite", inviteLabel || undefined],
			["Invite ID", readCtxString(context, "inviteId")],
			["Review", readCtxString(context, "adminPath")],
		],
		timestamp: event.timestamp,
	});
}

function formatHttp500(event: LoggerEvent): string {
	const context = event.context;
	const method = readCtxString(context, "method");
	const path = readCtxString(context, "path");
	const durationMs = readCtxNumber(context, "durationMs");

	return buildTelegramBlock({
		title: formatTitle(event),
		message: event.message,
		details: [
			["Request", method && path ? `${method} ${path}` : undefined],
			["Status", readCtxNumber(context, "status")],
			["Duration", durationMs != null ? `${durationMs} ms` : undefined],
		],
		timestamp: event.timestamp,
	});
}

function formatErrorContext(event: LoggerEvent, detailKeys: string[]): string {
	const context = event.context;
	return buildTelegramBlock({
		title: formatTitle(event),
		message: event.message,
		details: detailKeys.map((key) => {
			const label = key.charAt(0).toUpperCase() + key.slice(1);
			return [label, readCtxString(context, key)] as const;
		}),
		timestamp: event.timestamp,
	});
}

function balanceAlertSymbol(event: LoggerEvent): string {
	switch (event.name) {
		case "server.relayer_gas_low":
			return "ETH";
		case "server.foc_fil_low":
			return readCtxString(event.context, "token") ?? "FIL";
		case "server.foc_usdfc_low":
			return readCtxString(event.context, "token") ?? "USDFC";
		default:
			return readCtxString(event.context, "token") ?? "ETH";
	}
}

function formatBalanceAlert(event: LoggerEvent): string {
	const context = event.context;
	const wallet = readCtxString(context, "wallet");
	const symbol = balanceAlertSymbol(event);

	return buildTelegramBlock({
		title: formatTitle(event),
		message: event.message,
		details: [
			["Token", readCtxString(context, "token")],
			["Wallet", wallet ? truncateEvmAddress(wallet) : undefined],
			[
				"Balance",
				formatWeiWithSymbol(readCtxString(context, "balanceWei"), symbol),
			],
			[
				"Threshold",
				formatWeiWithSymbol(readCtxString(context, "thresholdWei"), symbol),
			],
			["Deployment", readCtxString(context, "deployment")],
			["Chain", readCtxString(context, "chain")],
		],
		timestamp: event.timestamp,
	});
}

function formatRpcDegraded(event: LoggerEvent): string {
	const context = event.context;
	const fallbackEnabled = readCtxBoolean(context, "fallbackEnabled");

	return buildTelegramBlock({
		title: formatTitle(event),
		message: event.message,
		details: [
			["Chain", readCtxString(context, "chainKey")],
			["RPC", readCtxString(context, "rpcUrl")],
			[
				"Fallback",
				fallbackEnabled == null
					? undefined
					: fallbackEnabled
						? "enabled"
						: "disabled",
			],
			["Error", readCtxString(context, "error")],
		],
		timestamp: event.timestamp,
	});
}

function formatSettlementPayoutFailed(event: LoggerEvent): string {
	const context = event.context;
	return buildTelegramBlock({
		title: formatTitle(event),
		message: event.message,
		details: [
			["Rule", readCtxString(context, "onChainRuleId")],
			["Status", readCtxString(context, "status")],
			["Piece", readCtxString(context, "pieceCid")],
			["Tx", readCtxString(context, "txHash")],
			["Error", readCtxString(context, "error")],
		],
		timestamp: event.timestamp,
	});
}

function formatGeneric(event: LoggerEvent): string {
	const context = event.context;
	const details =
		context == null
			? []
			: Object.entries(context).map(([key, value]) => {
					const label = key.charAt(0).toUpperCase() + key.slice(1);
					if (
						typeof value === "string" ||
						typeof value === "number" ||
						typeof value === "boolean"
					) {
						return [label, value] as const;
					}
					return [label, JSON.stringify(value)] as const;
				});

	return buildTelegramBlock({
		title: formatTitle(event),
		message: event.message,
		details,
		timestamp: event.timestamp,
	});
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
			return formatErrorContext(event, [
				"queueName",
				"jobId",
				"outboxId",
				"error",
			]);
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
		case "platform.access_request_submitted":
			return formatPlatformAccessRequest(event);
		case "platform.payout_access_request_submitted":
			return formatPayoutAccessRequest(event);
		case "platform.partner_invite_redeemed":
			return formatPartnerInviteRedeemed(event);
		default:
			return formatGeneric(event);
	}
}
