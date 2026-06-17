import { describe, expect, it } from "bun:test";
import { payoutAccessRequestDialogProps } from "@/src/lib/domains/settlements/payout-access/controls";
import { payoutAccessRequestIntent } from "@/src/lib/domains/settlements/payout-access/intent";

describe("payoutAccessRequestIntent", () => {
	it("opens the request dialog for workspace admins", () => {
		expect(payoutAccessRequestIntent(true)).toBe("open");
	});

	it("requires admin when the user cannot manage the workspace", () => {
		expect(payoutAccessRequestIntent(false)).toBe("admin_required");
	});
});

describe("payoutAccessRequestDialogProps", () => {
	it("binds dialog open state to payout access form controls", () => {
		const onOpenChange = () => {};
		const submitAccessRequest = () => {};

		expect(
			payoutAccessRequestDialogProps(
				{ open: true, onOpenChange },
				{
					useCase: "Pay contractors",
					setUseCase: () => {},
					acceptTerms: true,
					setAcceptTerms: () => {},
					sanctionsSelfCert: true,
					setSanctionsSelfCert: () => {},
					canSubmitRequest: true,
					submitPending: false,
					submitAccessRequest,
				},
			),
		).toEqual({
			open: true,
			onOpenChange,
			useCase: "Pay contractors",
			onUseCaseChange: expect.any(Function),
			acceptTerms: true,
			onAcceptTermsChange: expect.any(Function),
			sanctionsSelfCert: true,
			onSanctionsSelfCertChange: expect.any(Function),
			canSubmit: true,
			pending: false,
			onSubmit: submitAccessRequest,
		});
	});
});
