import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const serverRoot = join(import.meta.dir, "../..");

describe("attachment release execution", () => {
	test("post-sign hook calls tryExecuteAttachmentReleasesForPiece", () => {
		const src = readFileSync(
			join(serverRoot, "lib/domains/files/piece-sign.ts"),
			"utf8",
		);
		expect(src).toContain("tryExecuteAttachmentReleasesForPiece");
	});

	test("cron registers sync-attachment-releases", () => {
		const src = readFileSync(
			join(serverRoot, "lib/platform/cron/index.ts"),
			"utf8",
		);
		expect(src).toContain("registerSyncAttachmentReleasesCron");
	});
});
