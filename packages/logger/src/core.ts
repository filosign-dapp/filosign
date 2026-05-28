import type { LoggerEvent, LoggerTransport } from "./types";

export function createLoggerRuntime(args: {
	transports: LoggerTransport[];
	shouldSend?: (event: LoggerEvent) => boolean;
}): {
	emit(event: LoggerEvent): Promise<void>;
} {
	const transports = args.transports;
	const shouldSend = args.shouldSend ?? (() => true);

	return {
		async emit(event) {
			if (!shouldSend(event)) return;
			await Promise.allSettled(
				transports.map((transport) => transport.send(event)),
			);
		},
	};
}
