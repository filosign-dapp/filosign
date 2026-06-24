import type { SendFileIncompleteStep } from "@filosign/react/files";

const STEP_LABELS: Record<SendFileIncompleteStep, string> = {
	attachment_rule: "conditional file",
	payout_registration: "payout",
	self_sign: "your signature fields",
};

export function postSendIncompleteStepsMessage(
	steps: readonly SendFileIncompleteStep[],
): string {
	if (steps.length === 0) return "";

	const labels = steps.map((step) => STEP_LABELS[step]);
	if (labels.length === 1) {
		const label = labels[0];
		if (label === "conditional file") {
			return "Your envelope was sent. The conditional file wasn't attached on chain. You can add it from the document page.";
		}
		if (label === "payout") {
			return "Your envelope was sent. The payout wasn't set up. You can add it from the document page.";
		}
		if (label === "your signature fields") {
			return "Your envelope was sent. Your own signature fields weren't completed. Open the document to sign them.";
		}
	}

	return `Your envelope was sent. These optional steps didn't finish: ${labels.join(", ")}. You can add them from the document page.`;
}
