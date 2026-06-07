import { beforeAll, describe, expect, test } from "bun:test";
import {
	renderAccessRequestApproved,
	renderCheckoutContinue,
	renderDocumentShared,
	renderEnvelopeCompleted,
	renderPaidSetup,
	renderPartnerInvite,
} from "@filosign/emails";

const CTA = "https://app.filosign.com/example";
const ASSET_BASE = "https://assets.filosign.test";

beforeAll(() => {
	process.env.ASTRO_URL = ASSET_BASE;
});

describe("email templates", () => {
	test("document shared warm initial uses barebone layout", async () => {
		const { html } = await renderDocumentShared({
			senderLabel: "Alex",
			ctaHref: CTA,
			variant: "warm",
			intent: "initial",
			context: "sign",
		});
		expect(html).toContain(CTA);
		expect(html).toContain("font-size:28px");
		expect(html).toContain(`${ASSET_BASE}/logo.webp`);
	});

	test("document shared cold initial uses protocol layout", async () => {
		const { html } = await renderDocumentShared({
			senderLabel: "Alex",
			ctaHref: CTA,
			variant: "cold",
			intent: "initial",
			context: "sign",
		});
		expect(html).toContain(CTA);
		expect(html).toContain("font-size:56px");
		expect(html).toContain("/emails/dither/");
	});

	test("document shared reminder uses matte layout", async () => {
		const { html } = await renderDocumentShared({
			senderLabel: "Alex",
			ctaHref: CTA,
			variant: "warm",
			intent: "reminder",
			context: "sign",
		});
		expect(html).toContain(CTA);
		expect(html).toContain("font-size:48px");
		expect(html).toContain("/emails/collage/");
	});

	test("document shared draft review uses studio layout", async () => {
		const { html } = await renderDocumentShared({
			senderLabel: "Alex",
			ctaHref: CTA,
			variant: "warm",
			intent: "initial",
			context: "draft_review",
			documentTitle: "Vendor Agreement",
		});
		expect(html).toContain(CTA);
		expect(html).toContain("IBM Plex Mono");
		expect(html).toContain("/emails/tech/");
	});

	test("envelope completed uses arcane layout", async () => {
		const { html } = await renderEnvelopeCompleted({
			envelopeName: "SAFE",
			ctaHref: CTA,
		});
		expect(html).toContain(CTA);
		expect(html).toContain("font-size:72px");
		expect(html).toContain("/emails/skin/");
	});

	test("checkout continue uses matte layout", async () => {
		const { html } = await renderCheckoutContinue({
			planLabel: "Teams Pro",
			ctaHref: CTA,
		});
		expect(html).toContain(CTA);
		expect(html).toContain("font-size:48px");
		expect(html).toContain("Teams Pro");
	});

	test("paid setup uses barebone layout", async () => {
		const { html } = await renderPaidSetup({
			planLabel: "Teams Pro",
			ctaHref: CTA,
		});
		expect(html).toContain(CTA);
		expect(html).toContain("font-size:28px");
	});

	test("access request approved uses studio layout", async () => {
		const { html } = await renderAccessRequestApproved({
			planLabel: "Teams Pro",
			trialDays: 30,
			ctaHref: CTA,
		});
		expect(html).toContain(CTA);
		expect(html).toContain("IBM Plex Mono");
	});

	test("partner invite uses arcane layout", async () => {
		const { html } = await renderPartnerInvite({
			recipientName: "Jordan",
			planLabel: "Teams Pro",
			trialDays: 30,
			ctaHref: CTA,
			personalMessage: "Welcome aboard.",
		});
		expect(html).toContain(CTA);
		expect(html).toContain("font-size:72px");
		expect(html).toContain("Welcome aboard.");
	});
});
