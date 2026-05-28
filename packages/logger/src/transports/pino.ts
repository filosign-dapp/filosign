import { createRequire } from "node:module";
import pino from "pino";

export function createPinoLogger(args: {
	debug: boolean;
	chain: "local" | "testnet" | "mainnet";
}): pino.Logger {
	const level = args.debug ? "debug" : "info";

	if (args.chain === "local") {
		const require = createRequire(import.meta.url);
		try {
			const pretty = require("pino-pretty");
			return pino(
				{ level },
				pretty({
					colorize: true,
					translateTime: "HH:MM:ss",
					ignore: "pid,hostname",
					singleLine: true,
				}),
			);
		} catch {
			// best effort local pretty logging
		}
	}

	return pino({ level });
}
