import type { Address } from "viem";
import db from "@/lib/platform/db";

const { auditEvents } = db.schema;

export async function writeAuditEvent(args: {
	actorWallet?: Address | null;
	organizationId?: string | null;
	action: string;
	resourceType: string;
	resourceId: string;
	metadata?: Record<string, unknown> | null;
}): Promise<void> {
	await db.insert(auditEvents).values({
		actorWallet: args.actorWallet ?? null,
		organizationId: args.organizationId ?? null,
		action: args.action,
		resourceType: args.resourceType,
		resourceId: args.resourceId,
		metadataJson: args.metadata ?? null,
	});
}
