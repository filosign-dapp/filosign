import { die } from "../cli.ts";
import {
	type Action,
	ALL_SERVICES,
	type ParsedProdArgv,
	type ServiceId,
} from "./types.ts";

/** Short flags first; long names kept as aliases. */
const TARGET_FLAGS: Record<string, ServiceId> = {
	"--pg": "postgres",
	"--postgres": "postgres",
	"--pgbackup": "backups",
	"--backups": "backups",
	"--dfly": "dragonfly",
	"--dragonfly": "dragonfly",
	"--api": "api",
	"--worker": "worker",
};

const ACTION_FLAGS = new Set(["--health", "--info", "--migrate"]);
const QUIET_FLAGS = new Set(["--quiet", "-q"]);

function isVerbose(argv: string[]): boolean {
	return !argv.some((a) => QUIET_FLAGS.has(a));
}

function targetFlagsIn(argv: string[]): string[] {
	return argv.filter((a) => a in TARGET_FLAGS);
}

function collectTargets(argv: string[]): ServiceId[] {
	const seen = new Set<ServiceId>();
	for (const arg of targetFlagsIn(argv)) {
		const id = TARGET_FLAGS[arg];
		if (id) seen.add(id);
	}
	return [...seen];
}

export function parseProdArgv(argv: string[]): ParsedProdArgv {
	const verbose = isVerbose(argv);

	if (argv.length === 0) {
		return {
			kind: "probes",
			targets: [...ALL_SERVICES],
			action: "health",
			verbose,
		};
	}

	const hasMigrate = argv.includes("--migrate");
	const hasAll = argv.includes("--all");
	const actions = argv.filter((a) => ACTION_FLAGS.has(a));

	if (actions.length > 1) {
		die("Use one action: --health, --info, or --migrate");
	}

	if (hasMigrate) {
		if (
			hasAll ||
			targetFlagsIn(argv).length > 0 ||
			argv.includes("--health") ||
			argv.includes("--info")
		) {
			die("--migrate cannot combine with service targets or --health/--info");
		}
		return { kind: "migrate", verbose };
	}

	const targets: ServiceId[] = hasAll
		? [...ALL_SERVICES]
		: collectTargets(argv);

	if (targets.length === 0) {
		die(
			"Specify a target (--pg, --pgbackup, --dfly, --api, --worker) or --all, or --migrate",
		);
	}

	let action: Action = "health";
	if (argv.includes("--info")) action = "info";
	else if (argv.includes("--health")) action = "health";

	return { kind: "probes", targets, action, verbose };
}
