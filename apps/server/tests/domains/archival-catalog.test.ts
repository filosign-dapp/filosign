import { describe, expect, test } from "bun:test";
import { check } from "@filosign/entitlements";
import { exportGraceEnd } from "@/lib/domains/archival";
import {
	ARCHIVAL_PRODUCT_IDS,
	archivalTermYears,
	listArchivalCatalogProducts,
	resolveArchivalProductIdFromDodoProduct,
} from "@/lib/domains/billing/utils/archival-products";

describe("archival products catalog", () => {
	test("lists three SKUs without 10y tier", () => {
		const products = listArchivalCatalogProducts();
		expect(products).toHaveLength(3);
		expect(products.map((p) => p.productId).sort()).toEqual(
			[...ARCHIVAL_PRODUCT_IDS].sort(),
		);
		expect(products.some((p) => p.productId.includes("10"))).toBe(false);
	});

	test("term years match product ids", () => {
		expect(archivalTermYears("archival_year")).toBe(1);
		expect(archivalTermYears("archival_bundle_3y")).toBe(3);
		expect(archivalTermYears("archival_bundle_5y")).toBe(5);
	});

	test("archival Dodo products do not map to workspace plans", () => {
		expect(
			resolveArchivalProductIdFromDodoProduct("pdt_0NfmPizJ6Qed3qp9tEeim"),
		).toBeNull();
	});
});

describe("features.archival.purchase entitlement", () => {
	test("enabled on Solo, disabled on Free", () => {
		const free = check(
			{
				subject: { type: "user", wallet: "0x1" },
				planId: "free",
				periodStart: new Date(),
				usage: {},
			},
			"features.archival.purchase",
		);
		const solo = check(
			{
				subject: { type: "user", wallet: "0x1" },
				planId: "individual",
				periodStart: new Date(),
				usage: {},
			},
			"features.archival.purchase",
		);
		expect(free.allowed).toBe(false);
		expect(solo.allowed).toBe(true);
	});
});

describe("exportGraceEnd", () => {
	test("defaults to 30 days ahead", () => {
		const from = new Date("2026-01-01T00:00:00.000Z");
		const end = exportGraceEnd(from);
		const diffDays = Math.round(
			(end.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
		);
		expect(diffDays).toBe(30);
	});
});
