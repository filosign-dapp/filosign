export type LoggerSeverity = "debug" | "info" | "warn" | "error" | "critical";

export type LoggerEvent = {
	name: string;
	severity: LoggerSeverity;
	message: string;
	context?: Record<string, unknown>;
	timestamp?: number;
};

export type LoggerTransport = {
	send(event: LoggerEvent): Promise<void> | void;
};
