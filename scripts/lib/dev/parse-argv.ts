import { die } from "../cli.ts";

export type DevProfile = "local" | "staging" | "sandbox";

export type ParsedDevArgv = {
	help: boolean;
	flags: Set<string>;
	profile: DevProfile;
	withDeps: boolean;
};

type DevArgvState = {
	flags: Set<string>;
	profile: DevProfile | undefined;
	withDeps: boolean;
};

function applyDevArg(state: DevArgvState, arg: string): "help" | undefined {
	if (arg === "--help" || arg === "-h") return "help";
	if (arg === "--local") state.profile = "local";
	if (arg === "--staging") state.profile = "staging";
	if (arg === "--sandbox") state.profile = "sandbox";
	if (arg === "--testnet") {
		die(
			"Removed --testnet; use --staging (internal QA) or --sandbox (public demo)",
		);
	}
	if (arg === "--full") {
		die("Removed --full; astro is included in the default bun run dev stack");
	}
	if (arg === "--deps") state.flags.add("deps");
	if (arg === "--no-deps") state.withDeps = false;
	if (arg === "--serloc") state.flags.add("serloc");
	if (arg === "--web") state.flags.add("web");
	if (arg === "--emails") state.flags.add("emails");
	if (arg === "--astro") state.flags.add("astro");
	if (arg === "--client") state.flags.add("client");
	if (arg === "--server") state.flags.add("server");
}

export function parseDevArgv(argv: string[]): ParsedDevArgv {
	const state: DevArgvState = {
		flags: new Set<string>(),
		profile: undefined,
		withDeps: true,
	};

	for (const arg of argv) {
		if (applyDevArg(state, arg) === "help") {
			return {
				help: true,
				flags: state.flags,
				profile: state.profile ?? "local",
				withDeps: state.withDeps,
			};
		}
	}

	return {
		help: false,
		flags: state.flags,
		profile: state.profile ?? "local",
		withDeps: state.withDeps,
	};
}
