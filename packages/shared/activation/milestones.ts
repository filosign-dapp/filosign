import { z } from "zod";

export const ACTIVATION_MILESTONE_IDS = [
	"signature_created",
	"practice_document_signed",
	"proof_packet_learned",
	"first_envelope_started",
	"first_envelope_sent",
] as const;

export type ActivationMilestoneId = (typeof ACTIVATION_MILESTONE_IDS)[number];

export const zActivationMilestoneId = z.enum(ACTIVATION_MILESTONE_IDS);

/** Milestones a user may clear from the tutorials page (not system-recorded events). */
export const USER_REVOCABLE_ACTIVATION_MILESTONES = [
	"proof_packet_learned",
] as const satisfies readonly ActivationMilestoneId[];

export type UserRevocableActivationMilestoneId =
	(typeof USER_REVOCABLE_ACTIVATION_MILESTONES)[number];

export const zUserRevocableActivationMilestoneId = z.enum(
	USER_REVOCABLE_ACTIVATION_MILESTONES,
);

/** Bump when checklist copy or step order changes materially. */
export const ACTIVATION_CATALOG_VERSION = 1;
