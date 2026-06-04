import { useEntitlements } from "@filosign/react/billing";
import type { PieceFileDekSource } from "@filosign/react/files";
import { useState } from "react";
import {
	FileCommentsSheet,
	FileCommentsTrigger,
} from "@/src/lib/domains/files/file-comments-sheet";

export function EnvelopeCommentsBlock(props: {
	pieceCid: string;
	dekSource: PieceFileDekSource | null | undefined;
}) {
	const [open, setOpen] = useState(false);
	const { data: entitlements } = useEntitlements();
	const enabled = Boolean(entitlements?.features["features.comments"]?.enabled);
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

export function pieceDetailToDekSource(file: {
	pieceCid: string;
	kemCiphertext?: string | null;
	encryptedEncryptionKey?: string | null;
	orgKemCiphertext?: string | null;
	orgEncryptedEncryptionKey?: string | null;
	organizationId?: string | null;
}): PieceFileDekSource {
	return {
		pieceCid: file.pieceCid,
		kemCiphertext: file.kemCiphertext ?? null,
		encryptedEncryptionKey: file.encryptedEncryptionKey ?? null,
		orgKemCiphertext: file.orgKemCiphertext ?? null,
		orgEncryptedEncryptionKey: file.orgEncryptedEncryptionKey ?? null,
		organizationId: file.organizationId ?? null,
	};
}
