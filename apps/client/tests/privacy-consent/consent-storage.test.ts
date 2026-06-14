import { describe, expect, test } from "bun:test";
import {
	localChoiceToServer,
	serverChoiceToLocal,
} from "@/src/lib/privacy-consent/consent-storage";

describe("analytics consent storage mapping", () => {
	test("maps server choices to local storage values", () => {
		expect(serverChoiceToLocal("granted")).toBe("accepted");
		expect(serverChoiceToLocal("denied")).toBe("declined");
		expect(serverChoiceToLocal("withdrawn")).toBe("declined");
	});

	test("maps local storage values to server choices", () => {
		expect(localChoiceToServer("accepted")).toBe("granted");
		expect(localChoiceToServer("declined")).toBe("denied");
	});
});
