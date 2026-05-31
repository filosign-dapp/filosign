import { ORPCError } from "@orpc/server";
import { continueCheckoutFromToken } from "@/lib/domains/billing/checkout-intents";
import { logger } from "@/lib/platform/pino";

export async function handleCheckoutContinueRequest(args: {
	token: string | undefined;
}): Promise<Response> {
	const token = args.token?.trim();
	if (!token) {
		return new Response("Missing checkout token", { status: 400 });
	}

	try {
		const { checkoutUrl } = await continueCheckoutFromToken({ token });
		return Response.redirect(checkoutUrl, 302);
	} catch (error) {
		if (error instanceof ORPCError) {
			logger.warn(
				{ token, message: error.message },
				"checkout continue failed",
			);
			return new Response(error.message, {
				status: error.code === "FORBIDDEN" ? 403 : 400,
			});
		}
		logger.error({ token, error }, "checkout continue unexpected error");
		return new Response("Unable to continue checkout", { status: 500 });
	}
}
