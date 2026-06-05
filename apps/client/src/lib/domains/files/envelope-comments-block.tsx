import type { PieceFileDekSource } from "@filosign/react/files";
import type { AppRouterClient, InferClientOutputs } from "@filosign/react/orpc";
import { useState } from "react";
import {
	FileCommentsSheet,
	FileCommentsTrigger,
} from "@/src/lib/domains/files/file-comments-sheet";

type PieceDetailOutput =
	InferClientOutputs<AppRouterClient>["files"]["piece"]["detail"];

type PieceDetailDekFields = Pick<
	PieceDetailOutput,
	| "pieceCid"
	| "kemCiphertext"
	| "encryptedEncryptionKey"
	| "orgKemCiphertext"
	| "orgEncryptedEncryptionKey"
	| "organizationId"
>;

type SignPageCommentVisibility = Pick<
	PieceDetailOutput,
	"commentsFeatureEnabled" | "hasSenderComments"
>;

export function EnvelopeCommentsBlock(props: {
	pieceCid: string;
	dekSource: PieceFileDekSource | null | undefined;
	/** Sender org plan allows comments (from pieceDetail). */
	commentsFeatureEnabled?: boolean;
	/** Sign page: gate on envelope org plan + existing sender comments. */
	signPageVisibility?: SignPageCommentVisibility;
}) {
	const [open, setOpen] = useState(false);
	const enabled = props.signPageVisibility
		? props.signPageVisibility.commentsFeatureEnabled &&
			props.signPageVisibility.hasSenderComments
		: Boolean(props.commentsFeatureEnabled);
	const canDecrypt = Boolean(
		props.dekSource &&
			((props.dekSource.orgKemCiphertext && props.dekSource.organizationId) ||
				(props.dekSource.kemCiphertext &&
					props.dekSource.encryptedEncryptionKey)),
	);

	if (!enabled || !props.dekSource) {
		return null;
	}

	return (
		<>
			<FileCommentsTrigger
				onClick={() => setOpen(true)}
				disabled={!canDecrypt}
			/>
			<FileCommentsSheet
				pieceCid={props.pieceCid}
				dekSource={props.dekSource}
				open={open}
				onOpenChange={setOpen}
			/>
		</>
	);
}

type SignPageCommentFile = PieceDetailDekFields &
	Pick<PieceDetailOutput, "commentsFeatureEnabled" | "hasSenderComments">;

export function SignPageEnvelopeCommentsBlock(props: {
	file: SignPageCommentFile | null | undefined;
}) {
	if (!props.file?.pieceCid) {
		return null;
	}

	return (
		<EnvelopeCommentsBlock
			pieceCid={props.file.pieceCid}
			dekSource={pieceDetailToDekSource(props.file)}
			signPageVisibility={{
				commentsFeatureEnabled: props.file.commentsFeatureEnabled ?? false,
				hasSenderComments: props.file.hasSenderComments ?? false,
			}}
		/>
	);
}

export function pieceDetailToDekSource(
	file: PieceDetailDekFields,
): PieceFileDekSource {
	return {
		pieceCid: file.pieceCid,
		kemCiphertext: file.kemCiphertext ?? null,
		encryptedEncryptionKey: file.encryptedEncryptionKey ?? null,
		orgKemCiphertext: file.orgKemCiphertext ?? null,
		orgEncryptedEncryptionKey: file.orgEncryptedEncryptionKey ?? null,
		organizationId: file.organizationId ?? null,
	};
}
