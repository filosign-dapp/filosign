import type { MiddlewareHandler } from "hono";
import config from "@/config";

export const csp: MiddlewareHandler = async (c, next) => {
	c.header("Content-Security-Policy", config.http.contentSecurityPolicy);
	await next();
};
