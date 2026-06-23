import type { FilosignRpcQueryUtils } from "@filosign/react";
import {
	buildVisualCompletionForPlacementField,
	ensureDefaultTypedSignatureArtifact,
	toSignaturePrefetchProfile,
} from "@filosign/react/users";
import type {
	FieldCompletion,
	PlacementField,
	UserSignatureArtifact,
	UserSignatureRole,
} from "@filosign/shared";
import type { QueryClient } from "@tanstack/react-query";
import type { PlacementLayout } from "@/src/lib/domains/files/use-placement-layout";
import {
	buildAutoFieldCompletion,
	buildCheckboxFieldCompletion,
} from "./field-completion-builders";

type DefaultArtifacts = {
	signature: UserSignatureArtifact | null;
	initial: UserSignatureArtifact | null;
};

type ResolvePlacementFieldCompletionArgs = {
	field: PlacementField;
	defaultArtifacts: DefaultArtifacts;
	profile:
		| {
				firstName?: string | null;
				lastName?: string | null;
				email?: string | null;
				defaultSignatureId?: string | null;
				defaultInitialId?: string | null;
				username?: string | null;
		  }
		| null
		| undefined;
	layout: PlacementLayout;
	rpcQuery?: FilosignRpcQueryUtils;
	queryClient?: QueryClient;
	signatures?: UserSignatureArtifact[];
};

async function fetchSignatureLibrary(
	queryClient: QueryClient | undefined,
	rpcQuery: FilosignRpcQueryUtils,
): Promise<UserSignatureArtifact[]> {
	if (queryClient) {
		const data = await queryClient.fetchQuery(
			rpcQuery.users.signatures.list.queryOptions(),
		);
		return data.signatures;
	}
	const data = await rpcQuery.users.signatures.list.call();
	return data.signatures;
}

async function ensureVisualArtifact(args: {
	role: UserSignatureRole;
	profile: NonNullable<ResolvePlacementFieldCompletionArgs["profile"]>;
	defaultArtifacts: DefaultArtifacts;
	rpcQuery: FilosignRpcQueryUtils;
	queryClient?: QueryClient;
	signatures: UserSignatureArtifact[];
}): Promise<UserSignatureArtifact | null> {
	const cached =
		args.role === "signature"
			? args.defaultArtifacts.signature
			: args.defaultArtifacts.initial;
	if (cached) return cached;

	try {
		const ensured = await ensureDefaultTypedSignatureArtifact({
			rpcQuery: args.rpcQuery,
			profile: toSignaturePrefetchProfile(args.profile),
			role: args.role,
			signatures: args.signatures,
		});
		const refreshed = await fetchSignatureLibrary(
			args.queryClient,
			args.rpcQuery,
		);
		return refreshed.find((row) => row.id === ensured.id) ?? null;
	} catch {
		return null;
	}
}

export async function resolvePlacementFieldCompletion(
	args: ResolvePlacementFieldCompletionArgs,
): Promise<FieldCompletion | null> {
	if (
		args.field.type === "date" ||
		args.field.type === "name" ||
		args.field.type === "email"
	) {
		return buildAutoFieldCompletion(args.field, args.profile);
	}

	if (args.field.type === "checkbox") {
		return buildCheckboxFieldCompletion(args.field.id);
	}

	if (args.field.type !== "signature" && args.field.type !== "initial") {
		return null;
	}

	const role = args.field.type;
	const cached =
		role === "signature"
			? args.defaultArtifacts.signature
			: args.defaultArtifacts.initial;

	let artifact = cached;
	if (!artifact && args.rpcQuery && args.profile) {
		artifact = await ensureVisualArtifact({
			role,
			profile: args.profile,
			defaultArtifacts: args.defaultArtifacts,
			rpcQuery: args.rpcQuery,
			queryClient: args.queryClient,
			signatures: args.signatures ?? [],
		});
	}

	if (!artifact) return null;

	return buildVisualCompletionForPlacementField({
		field: args.field,
		artifact,
		layoutWidth: args.layout.width,
		layoutHeight: args.layout.height,
	});
}
