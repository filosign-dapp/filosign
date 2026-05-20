import {
	useAckFile,
	useFileInfo,
	useReceivedFiles,
	useViewFile,
} from "@filosign/react/files";
import { useApproveSender, useReceivedRequests } from "@filosign/react/sharing";
import {
	ArrowClockwiseIcon,
	BellIcon,
	CheckCircleIcon,
	FileTextIcon,
	SignatureIcon,
	UserCheckIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/src/lib/components/ui/alert-dialog";
import { Badge } from "@/src/lib/components/ui/badge";
import { Button } from "@/src/lib/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/src/lib/components/ui/popover";
import { Separator } from "@/src/lib/components/ui/separator";
import { NotificationItemCard } from "./notification-item-card";

export function NotificationsPopover() {
	const [open, setOpen] = useState(false);
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
	const [pendingAcceptRequestId, setPendingAcceptRequestId] = useState<
		string | null
	>(null);
	const [pendingAcceptWallet, setPendingAcceptWallet] = useState<string | null>(
		null,
	);
	const queryClient = useQueryClient();

	// Only get the actionable data - pending requests and unacknowledged files
	const receivedRequests = useReceivedRequests();
	const receivedFiles = useReceivedFiles();
	const allowSharing = useApproveSender();

	// Calculate notification counts - all received files and requests
	const getNotificationCount = () => {
		let count = 0;

		// Count all received files (both acknowledged and unacknowledged)
		if (receivedFiles.data && Array.isArray(receivedFiles.data)) {
			count += receivedFiles.data.length;
		}

		// Count pending received requests
		if (receivedRequests.data && Array.isArray(receivedRequests.data)) {
			count += receivedRequests.data.filter(
				(req) => req.status === "PENDING",
			).length;
		}

		return count;
	};

	const notificationCount = getNotificationCount();

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	const handleAllowSharing = (requestId: string, senderWallet: string) => {
		setPendingAcceptRequestId(requestId);
		setPendingAcceptWallet(senderWallet);
		setConfirmDialogOpen(true);
	};

	const confirmAllowSharing = async () => {
		if (!pendingAcceptRequestId || !pendingAcceptWallet) return;

		try {
			await allowSharing.mutateAsync({
				sender: pendingAcceptWallet as `0x${string}`,
				establishMutualConnection: true,
				shareRequestId: pendingAcceptRequestId,
			});
			toast.success("Sharing request accepted!");
			await queryClient.invalidateQueries({
				queryKey: ["received-requests"],
			});
			setConfirmDialogOpen(false);
			setPendingAcceptRequestId(null);
			setPendingAcceptWallet(null);
		} catch (error) {
			console.error("Failed to accept sharing request:", error);
			toast.error("Failed to accept sharing request");
		}
	};

	const pendingRequests = (() => {
		return receivedRequests.data && Array.isArray(receivedRequests.data)
			? receivedRequests.data.filter((req) => req.status === "PENDING")
			: [];
	})();

	const allReceivedFiles =
		receivedFiles.data && Array.isArray(receivedFiles.data)
			? receivedFiles.data
			: [];

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						className="relative h-10 w-10 rounded-full transition-all duration-150 hover:bg-accent/50"
					/>
				}
			>
				<div className="flex aspect-square size-8 items-center justify-center bg-muted/10 rounded-full">
					<BellIcon className="size-5 text-muted-foreground" weight="bold" />
				</div>
				{notificationCount > 0 && (
					<Badge
						variant="destructive"
						className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
					>
						{notificationCount > 9 ? "9+" : notificationCount}
					</Badge>
				)}
			</PopoverTrigger>

			<PopoverContent className="w-96 mt-2 p-0" align="end">
				<div className="p-4 border-b">
					<div className="flex items-center justify-between">
						<div>
							<h3 className="font-manrope">Notifications</h3>
							<p className="text-sm text-muted-foreground mt-1 font-manrope">
								{notificationCount > 0
									? `${notificationCount} pending action${notificationCount > 1 ? "s" : ""}`
									: "You're all caught up!"}
							</p>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								receivedRequests.refetch();
								receivedFiles.refetch();
							}}
							disabled={receivedRequests.isFetching || receivedFiles.isFetching}
							className="h-6 w-6 p-0"
						>
							<ArrowClockwiseIcon className="h-3 w-3" />
						</Button>
					</div>
				</div>

				<div className="max-h-96 overflow-y-auto">
					{/* Loading State */}
					{(receivedRequests.isLoading || receivedFiles.isLoading) && (
						<div className="p-8 text-center">
							<div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
							<p className="text-sm text-muted-foreground">
								Loading notifications...
							</p>
						</div>
					)}

					{/* Pending Sharing Requests */}
					{pendingRequests.length > 0 && (
						<div className="p-4">
							<div className="flex items-center gap-2 mb-4">
								<UserCheckIcon className="h-4 w-4 text-primary" />
								<h4 className="text-sm font-semibold">Sharing Requests</h4>
								<Badge variant="secondary" className="text-xs">
									{pendingRequests.length}
								</Badge>
							</div>

							<div className="space-y-3">
								{pendingRequests.map((req) => (
									<NotificationItemCard
										key={req.id}
										icon={<UserCheckIcon className="h-4 w-4 text-primary" />}
										title={`From: ${formatAddress(req.senderWallet)}`}
										subtitle={req.message || "No message provided"}
										variant="default"
										actionButton={{
											label: allowSharing.isPending ? "Accepting..." : "Accept",
											onClick: () =>
												handleAllowSharing(req.id, req.senderWallet),
											loading: allowSharing.isPending,
											variant: "default",
										}}
									/>
								))}
							</div>
						</div>
					)}

					{/* Received Files */}
					{allReceivedFiles.length > 0 && (
						<div className="p-4">
							{pendingRequests.length > 0 && <Separator className="mb-4" />}

							<div className="flex items-center gap-2 mb-4">
								<FileTextIcon className="h-4 w-4 text-primary" />
								<h4 className="text-sm font-semibold">Received Files</h4>
								<Badge variant="secondary" className="text-xs">
									{allReceivedFiles.length}
								</Badge>
							</div>

							<div className="space-y-3">
								{allReceivedFiles.map((file) => (
									<ReceivedFileNotification
										key={file.pieceCid}
										pieceCid={file.pieceCid}
										sender={file.sender}
										setOpen={setOpen}
									/>
								))}
							</div>
						</div>
					)}

					{/* Empty State */}
					{notificationCount === 0 &&
						!(receivedRequests.isLoading || receivedFiles.isLoading) && (
							<div className="p-8 text-center">
								<CheckCircleIcon className="h-12 w-12 text-chart-2 mx-auto mb-3" />
								<h4 className="text-sm font-medium mb-1">All caught up!</h4>
								<p className="text-xs text-muted-foreground">
									No pending actions at this time.
								</p>
							</div>
						)}
				</div>
			</PopoverContent>

			{/* Confirmation Dialog for Accepting Share Requests */}
			<AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Accept Sharing Request</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to accept this sharing request? This will
							allow the sender to share documents with you.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => {
								setConfirmDialogOpen(false);
								setPendingAcceptRequestId(null);
								setPendingAcceptWallet(null);
							}}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmAllowSharing}
							disabled={allowSharing.isPending}
						>
							{allowSharing.isPending ? "Accepting..." : "Accept Request"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Popover>
	);
}

// Component to handle individual received file notifications
function ReceivedFileNotification({
	pieceCid,
	sender,
	setOpen,
}: {
	pieceCid: string;
	sender: string;
	setOpen: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const { data: file } = useFileInfo({ pieceCid });
	const acknowledgeFile = useAckFile();
	const viewFile = useViewFile();
	const navigate = useNavigate();

	const handleAcknowledge = async () => {
		try {
			await acknowledgeFile.mutateAsync({ pieceCid });
			// Refresh the files list
			await queryClient.invalidateQueries({
				queryKey: ["received-files"],
			});
		} catch (error) {
			console.log(error);
			toast.error("Failed to accept file");
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
					status: file.status as "s3" | "foc",
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
					status: file.status as "s3" | "foc",
				});
			} else {
				return;
			}
			console.log("File data received:", fileData);

			// Save file to computer using metadata
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

			toast.success("File downloaded!");
		} catch (error) {
			console.error(error);
			toast.error("Failed to download file");
		}
	};

	const formatAddress = (address: string) => {
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

	// Recipient KEM ciphertext appears after acknowledging a personal envelope; org-vault ciphertext is present separately.
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
		setOpen(false); // Close the popover
	};

	if (!isAcknowledged) {
		// For unacknowledged files, show single Accept button
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

	// For acknowledged files, show Download and Sign buttons inline
	return (
		<div className="p-4 rounded-lg border bg-card">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					<div className="flex-shrink-0 mt-0.5">
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
				<div className="flex items-center gap-2 flex-shrink-0">
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
