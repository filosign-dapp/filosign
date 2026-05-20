import os from "node:os";
import env from "@/env";
import { jsonStringify } from "@/lib/platform/utils/json";

const BOT_TOKEN = env.TG_ANALYTICS_BOT_TOKEN;
const GROUP_ID = env.TG_ANALYTICS_BOT_GROUP_ID;

function log(message?: unknown, ...optionalParams: unknown[]) {
	if (!BOT_TOKEN || !GROUP_ID) return;

	const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

	const text = `${os.hostname()}:${process.pid}@${Date.now()}\n${[
		message,
		...optionalParams,
	]
		.map((j) => jsonStringify(j))
		.join("\n")}
    `;

	const body = {
		chat_id: GROUP_ID,
		text,
		// parse_mode: "HTML",
		disable_web_page_preview: true,
	};
	fetch(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

const analytics = {
	log,
};

export default analytics;
