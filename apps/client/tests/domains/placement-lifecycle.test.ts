import { describe, expect, it } from "bun:test";
import {
	envelopeDocumentLoadingMessage,
	envelopeEmptyDraftRedirectTarget,
	envelopeSuppressEmptyDraftRedirect,
	templateDocumentLoadingMessage,
	templateEmptyDraftRedirectTarget,
	templateSuppressEmptyDraftRedirect,
} from "../../src/lib/domains/placement/lifecycle";

describe("envelopeSuppressEmptyDraftRedirect", () => {
	it("does not suppress empty local draft redirect", () => {
		expect(
			envelopeSuppressEmptyDraftRedirect({
				sendStatus: "idle",
				sendProgressOpen: false,
				postSendDialogOpen: false,
				serverDraftLoadState: "idle",
				draftReady: false,
			}),
		).toBe(false);
	});

	it("suppresses while pending server draft is not ready", () => {
		expect(
			envelopeSuppressEmptyDraftRedirect({
				sendStatus: "idle",
				sendProgressOpen: false,
				postSendDialogOpen: false,
				serverDraftLoadState: "idle",
				pendingServerDraftId: "draft-1",
				draftReady: false,
			}),
		).toBe(true);
	});

	it("suppresses during send in flight", () => {
		expect(
			envelopeSuppressEmptyDraftRedirect({
				sendStatus: "loading",
				sendProgressOpen: false,
				postSendDialogOpen: false,
				serverDraftLoadState: "idle",
				draftReady: true,
			}),
		).toBe(true);
	});
});

describe("templateSuppressEmptyDraftRedirect", () => {
	it("suppresses empty template create draft", () => {
		expect(
			templateSuppressEmptyDraftRedirect({
				templateEditorLoadState: "idle",
				draftReady: false,
			}),
		).toBe(true);
	});

	it("suppresses while template is loading", () => {
		expect(
			templateSuppressEmptyDraftRedirect({
				templateEditorLoadState: "loading",
				draftReady: true,
			}),
		).toBe(true);
	});
});

describe("redirect targets", () => {
	it("returns envelope and template paths", () => {
		expect(envelopeEmptyDraftRedirectTarget()).toBe(
			"/dashboard/envelope/create",
		);
		expect(templateEmptyDraftRedirectTarget()).toBe("/dashboard/templates");
	});
});

describe("document loading messages", () => {
	it("returns envelope draft loading copy", () => {
		expect(envelopeDocumentLoadingMessage("loading")).toBe("Loading draft…");
		expect(envelopeDocumentLoadingMessage("awaiting_crypto")).toContain(
			"Unlocking encryption keys",
		);
	});

	it("returns template loading copy", () => {
		expect(templateDocumentLoadingMessage("loading")).toBe(
			"Loading template...",
		);
		expect(templateDocumentLoadingMessage("awaiting_crypto")).toContain(
			"Unlock encryption keys",
		);
	});
});
