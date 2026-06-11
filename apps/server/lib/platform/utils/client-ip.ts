/** First client IP from reverse-proxy headers (Hono request). */
export function resolveClientIpFromRequest(req: {
	header: (name: string) => string | undefined;
}): string {
	const fwd = req.header("x-forwarded-for");
	if (fwd) {
		const ip = fwd.split(",")[0]?.trim();
		if (ip) return ip;
	}
	const realIp = req.header("x-real-ip")?.trim();
	if (realIp) return realIp;
	return "unknown";
}
