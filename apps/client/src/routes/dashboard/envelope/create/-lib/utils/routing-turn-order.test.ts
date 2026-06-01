import { describe, expect, it } from "bun:test";
import type { Recipient } from "@/src/routes/dashboard/envelope/create/-lib/types";
import {
	defaultRoutingOrderFromRecipients,
	partitionRecipientsForTurnOrder,
	reorderSignersInRecipients,
	signerEmailsFromRecipients,
	syncRoutingOrderOnRecipientChange,
} from "@/src/routes/dashboard/envelope/create/-lib/utils/routing-turn-order";

function signer(id: string, email: string, name = email): Recipient {
	return {
		clientRowId: id,
		name,
		email,
		role: "signer",
	};
}

function viewer(id: string, email: string): Recipient {
	return {
		clientRowId: id,
		name: email,
		email,
		role: "viewer",
	};
}

describe("routing-turn-order", () => {
	it("partition sorts signers by routing order and keeps viewers separate", () => {
		const recipients = [
			signer("s1", "b@example.com"),
			viewer("v1", "v@example.com"),
			signer("s2", "a@example.com"),
		];

		const { signers, viewers } = partitionRecipientsForTurnOrder(recipients, [
			"a@example.com",
			"b@example.com",
		]);

		expect(signers.map((row) => row.recipient.clientRowId)).toEqual([
			"s2",
			"s1",
		]);
		expect(viewers.map((row) => row.recipient.clientRowId)).toEqual(["v1"]);
	});

	it("reorder updates signer block and routing emails", () => {
		const recipients = [
			signer("s1", "a@example.com"),
			signer("s2", "b@example.com"),
			signer("s3", "c@example.com"),
		];

		const result = reorderSignersInRecipients(recipients, 1, 0, [
			"a@example.com",
			"b@example.com",
			"c@example.com",
		]);

		expect(result.recipients.map((r) => r.clientRowId)).toEqual([
			"s2",
			"s1",
			"s3",
		]);
		expect(result.routingOrderEmails).toEqual([
			"b@example.com",
			"a@example.com",
			"c@example.com",
		]);
	});

	it("sync removes signer email when role changes to viewer", () => {
		const prev = [signer("s1", "a@example.com")];
		const next = [viewer("s1", "a@example.com")];

		const order = syncRoutingOrderOnRecipientChange(prev, next, [
			"a@example.com",
		]);

		expect(order).toEqual([]);
	});

	it("defaultRoutingOrderFromRecipients seeds from list order", () => {
		const recipients = [
			signer("s1", "b@example.com"),
			signer("s2", "a@example.com"),
		];
		expect(defaultRoutingOrderFromRecipients(recipients)).toEqual([
			"b@example.com",
			"a@example.com",
		]);
		expect(signerEmailsFromRecipients(recipients)).toEqual([
			"b@example.com",
			"a@example.com",
		]);
	});
});
