import type { DraftSnapshot } from "@filosign/shared";
import type { DecryptedDraftDocument } from "@/src/routes/draft/review/-lib/utils/snapshot-to-viewport";

export type DecryptedDraftReview = {
	title?: string;
	snapshot: DraftSnapshot;
	documents: DecryptedDraftDocument[];
};
