import { useFilosignContext } from "@filosign/react";
import type { FileInfo } from "@filosign/react/files";
import { useAckFile, useViewFile } from "@filosign/react/files";
import { FileTextIcon, SignatureIcon } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/src/lib/components/ui/button";
import { invalidateInboxQueries } from "@/src/lib/query/invalidate-inbox";
import { NotificationItemCard } from "./notification-item-card";

type ReceivedFileNotificationProps = {
	pieceCid: string;
	sender: string;
	file?: FileInfo;
	setOpen: (open: boolean) => void;
	formatAddress: (address: string) => string;
};

export function ReceivedFileNotification({
	pieceCid,
	sender,
	file,
	setOpen,
	formatAddress,
}: ReceivedFileNotificationProps) {
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const acknowledgeFile = useAckFile();
	const viewFile = useViewFile();
	const navigate = useNavigate();

	const handleAcknowledge = async () => {
		try {
			await acknowledgeFile.mutateAsync({ pieceCid });
			await invalidateInboxQueries(queryClient, rpcQuery);
		} catch (error) {
			console.error(error);
		}
	};

	const handleViewFile = async () => {
		if (!file) return;

		const kemCiphertext = file.kemCiphertext;
		const encryptedEncryptionKey = file.encryptedEncryptionKey;
		const participant = !!(kemCiphertext && encryptedEncryptionKey);
		const organizationId = file.organizationId;
		const orgKemCiphertext = file.orgKemCiphertext;
		const orgEncryptedEncryptionKey = file.orgEncryptedEncryptionKey;
		const orgVault =
			organizationId && orgKemCiphertext && orgEncryptedEncryptionKey;

		if (!(participant || orgVault)) return;

		try {
			let fileData: Awaited<ReturnType<typeof viewFile.mutateAsync>>;
			if (participant) {
				fileData = await viewFile.mutateAsync({
					pieceCid: file.pieceCid,
					kemCiphertext,
					encryptedEncryptionKey,
				});
			} else if (
				organizationId &&
				orgKemCiphertext &&
				orgEncryptedEncryptionKey
			) {
				fileData = await viewFile.mutateAsync({
					variant: "org",
					pieceCid: file.pieceCid,
					organizationId,
					orgKemCiphertext,
					orgEncryptedEncryptionKey,
				});
			} else {
				return;
			}

			const arrayBuffer = new ArrayBuffer(fileData.fileBytes.length);
			new Uint8Array(arrayBuffer).set(fileData.fileBytes);
			const blob = new Blob([arrayBuffer], {
				type: fileData.metadata.mimeType,
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileData.metadata.name;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error(error);
		}
	};

	if (!file) {
		return (
			<NotificationItemCard
				icon={<FileTextIcon className="h-4 w-4 text-primary" />}
				title={`File ${pieceCid.slice(0, 8)}...`}
				subtitle={`From: ${formatAddress(sender)}`}
				variant="info"
			/>
		);
	}

	const hasOrgDecryptMaterial =
		!!file.organizationId &&
		!!file.orgKemCiphertext &&
		!!file.orgEncryptedEncryptionKey;
	const isAcknowledged =
		!!(file.kemCiphertext && file.encryptedEncryptionKey) ||
		hasOrgDecryptMaterial;
	const hasSignatures = file.signatures && file.signatures.length > 0;

	const handleSignDocument = () => {
		navigate({
			to: "/dashboard/document/sign",
			search: { pieceCid },
		});
		setOpen(false);
	};

	if (!isAcknowledged) {
		return (
			<NotificationItemCard
				icon={<FileTextIcon className="h-4 w-4 text-primary" />}
				title={`File ${pieceCid.slice(0, 8)}...`}
				subtitle={`From: ${formatAddress(sender)}`}
				variant="info"
				actionButton={{
					label: acknowledgeFile.isPending ? "Accepting..." : "Accept",
					onClick: handleAcknowledge,
					loading: acknowledgeFile.isPending,
					variant: "outline",
				}}
			/>
		);
	}

	return (
		<div className="p-4 rounded-lg border bg-card">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<div className="shrink-0 mt-0.5">
						<FileTextIcon className="h-4 w-4 text-primary" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<h4 className="text-sm font-medium text-foreground truncate">
								File {pieceCid.slice(0, 8)}...
							</h4>
						</div>
						<p className="text-xs text-muted-foreground line-clamp-2">
							From: {formatAddress(sender)}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Button
						size="sm"
						variant="default"
						onClick={handleViewFile}
						disabled={viewFile.isPending}
						className="text-xs px-3 py-1 h-7"
						title="Download File"
					>
						{viewFile.isPending ? "..." : "⬇"}
					</Button>
					{!hasSignatures && (
						<Button
							size="sm"
							variant="outline"
							onClick={handleSignDocument}
							className="text-xs px-3 py-1 h-7"
							title="Sign Document"
						>
							<SignatureIcon className="h-3 w-3" />
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
