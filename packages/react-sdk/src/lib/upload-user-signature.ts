import {
	contentSha256Hex,
	extensionForContentType,
	INITIAL_RECT_ASPECT_RATIO,
	SIGNATURE_RECT_ASPECT_RATIO,
	type UserSignatureCreateInput,
	type UserSignatureRole,
} from "@filosign/shared";
import type { AppRouterClient } from "../orpc/app-router-types";

type RpcQuery = {
	storage: {
		presignPut: {
			call: (
				input: Parameters<AppRouterClient["storage"]["presignPut"]>[0],
			) => Promise<{ uploadUrl: string; key: string }>;
		};
	};
	users: {
		signatures: {
			create: {
				call: (
					input: UserSignatureCreateInput,
				) => Promise<{ artifact: { id: string } }>;
			};
			setDefault: {
				call: (input: {
					id: string;
					role: UserSignatureRole;
				}) => Promise<unknown>;
			};
		};
	};
};

export async function uploadUserSignatureArtifact(args: {
	rpcQuery: RpcQuery;
	bytes: Uint8Array;
	contentType: string;
	role: UserSignatureRole;
	kind: UserSignatureCreateInput["kind"];
	typedMeta?: UserSignatureCreateInput["typedMeta"];
	intrinsicAspectRatio?: number;
	setAsDefault?: boolean;
}): Promise<{ artifactId: string; storageKey: string }> {
	const contentSha256 = await contentSha256Hex(args.bytes);

	const { uploadUrl, key } = await args.rpcQuery.storage.presignPut.call({
		kind: "user_signature",
		contentType: args.contentType,
		contentSha256,
		role: args.role,
	});

	const putRes = await fetch(uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": args.contentType },
		body: new Blob([args.bytes.slice()], { type: args.contentType }),
	});
	if (!putRes.ok) {
		throw new Error(`Signature upload failed (${putRes.status})`);
	}

	const { artifact } = await args.rpcQuery.users.signatures.create.call({
		kind: args.kind,
		role: args.role,
		storageKey: key,
		contentType: args.contentType,
		contentSha256,
		typedMeta: args.typedMeta,
		intrinsicAspectRatio: args.intrinsicAspectRatio,
	});

	if (args.setAsDefault !== false) {
		await args.rpcQuery.users.signatures.setDefault.call({
			id: artifact.id,
			role: args.role,
		});
	}

	return { artifactId: artifact.id, storageKey: key };
}

export async function dataUrlToBytes(dataUrl: string): Promise<{
	bytes: Uint8Array;
	contentType: string;
}> {
	const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
	if (!match?.[1] || !match[2]) {
		throw new Error("Invalid data URL");
	}
	const contentType = match[1];
	const binary = atob(match[2]);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return { bytes, contentType };
}

export function svgStringToBytes(svg: string): Uint8Array {
	return new TextEncoder().encode(svg);
}

export function intrinsicAspectRatioFromBytes(
	_bytes: Uint8Array,
	contentType: string,
	role?: UserSignatureRole,
): number | undefined {
	const ext = extensionForContentType(contentType);
	if (ext === "svg") {
		return role === "initial"
			? INITIAL_RECT_ASPECT_RATIO
			: SIGNATURE_RECT_ASPECT_RATIO;
	}
	return undefined;
}
