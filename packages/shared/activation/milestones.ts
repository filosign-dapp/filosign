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

/** Bump when checklist copy or step order changes materially. */
export const ACTIVATION_CATALOG_VERSION = 1;
