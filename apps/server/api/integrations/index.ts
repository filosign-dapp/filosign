import { Hono } from "hono";

/** Non-oRPC `/api/integrations/*` routes (webhooks, partner callbacks). */
export const integrationsRouter = new Hono();
