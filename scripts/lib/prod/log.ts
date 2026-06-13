/** Consistent stdout logging for `bun run prod`. */

const PREFIX = "[prod]";

export type ProdLog = {
	verbose: boolean;
	info: (message: string) => void;
	ok: (message: string) => void;
	warn: (message: string) => void;
	fail: (message: string) => void;
	section: (title: string) => void;
	detail: (lines: string | string[] | undefined) => void;
};

export function createProdLog(verbose = true): ProdLog {
	const write = (stream: "out" | "err", line: string) => {
		const text = `${PREFIX} ${line}`;
		if (stream === "out") console.log(text);
		else console.error(text);
	};

	return {
		verbose,
		info: (message) => write("out", message),
		ok: (message) => write("out", `OK - ${message}`),
		warn: (message) => write("err", `WARN - ${message}`),
		fail: (message) => write("err", `FAIL - ${message}`),
		section: (title) => {
			write("out", "");
			write("out", `── ${title} ──`);
		},
		detail: (lines) => {
			if (!verbose || !lines) return;
			const items = Array.isArray(lines) ? lines : lines.split("\n");
			for (const line of items) {
				if (line.trim()) write("out", `    ${line}`);
			}
		},
	};
}
