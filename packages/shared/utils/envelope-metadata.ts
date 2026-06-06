import z from "zod";

const MAX_METADATA_KEYS = 20;
const MAX_KEY_LENGTH = 64;
const MAX_VALUE_LENGTH = 512;

export const zEnvelopeMetadata = z
	.record(z.string().max(MAX_KEY_LENGTH), z.string().max(MAX_VALUE_LENGTH))
	.refine((value) => Object.keys(value).length <= MAX_METADATA_KEYS, {
		error: `metadata may have at most ${MAX_METADATA_KEYS} keys`,
	});

export type EnvelopeMetadata = z.infer<typeof zEnvelopeMetadata>;
