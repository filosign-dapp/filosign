import type { RegisterRoutingInput } from "@filosign/shared";
import { usesAdvancedRegisterRouting } from "@filosign/shared";
import type { Recipient } from "@/src/lib/domains/files/envelope-form-types";

export function buildRegisterRoutingFromForm(args: {
	recipients: Recipient[];
	routing?: RegisterRoutingInput;
}): RegisterRoutingInput | undefined {
	const routing: RegisterRoutingInput = { ...args.routing };
	return usesAdvancedRegisterRouting(routing) ? routing : undefined;
}
