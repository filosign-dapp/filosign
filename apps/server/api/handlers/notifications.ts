import type { Address } from "viem";
import {
	notificationsDismiss,
	notificationsInbox,
} from "@/lib/domains/notifications";

export async function notificationsInboxHandler(
	userWallet: Address,
	input: unknown,
) {
	return notificationsInbox({ wallet: userWallet, input });
}

export async function notificationsDismissHandler(
	userWallet: Address,
	input: unknown,
) {
	return notificationsDismiss({ wallet: userWallet, input });
}
