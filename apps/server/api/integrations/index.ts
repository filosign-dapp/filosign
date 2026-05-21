import { Hono } from "hono";
import { gelatoRouter } from "./gelato";

/** Non-oRPC `/api/integrations/*` routes (webhooks, partner callbacks). */
export const integrationsRouter = new Hono().route(
	"/integrations/gelato",
	gelatoRouter,
);
