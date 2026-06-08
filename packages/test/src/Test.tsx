import { useFilosignContext } from "@filosign/react";
import {
	useIsLoggedIn,
	useIsRegistered,
	useLogin,
	useLogout,
} from "@filosign/react/auth";
import { useDocumentsList } from "@filosign/react/documents";
import {
	useAckFile,
	useFileInfo,
	useSendFile,
	useSignFile,
	useViewFile,
} from "@filosign/react/files";
import { useUserProfile, useUserProfileByQuery } from "@filosign/react/users";
import type { PlacementManifest } from "@filosign/shared";
import { normalizePlacementRecipientEmail } from "@filosign/shared";
import { memo, useId, useMemo, useState } from "react";
import {
	useCurrentWalletAddress,
	useOtherAddress,
	useOtherReload,
} from "./App";
import { SectionHeading } from "./components/SectionHeading";
import { dummyBytes } from "./dumy";
import { useEffectOnce } from "./hooks/useEffectOnce";
import { useSet } from "./hooks/useSet";
import { useTimeout } from "./hooks/useTimeout";
import {
	type FileValidationError,
	MAX_CID_DISPLAY_LENGTH,
	MAX_CONTENT_DISPLAY_LENGTH,
	MAX_FILE_NAME_DISPLAY,
	parseFileStatus,
	parseString,
	RELOAD_DELAY_MS,
	TRUNCATED_CID_LENGTH,
	TRUNCATED_CONTENT_LENGTH,
	TRUNCATED_FILE_NAME_LENGTH,
	validateFile,
} from "./lib/validation";

type TestName =
	| "login"
	| "check-this-user-info"
	| "check-other-user-info"
	| "check-send"
	| "file-send"
	| "file-sign";
type NotifierFn = (name: TestName) => void;

const getErrorMessage = (error: Error | null): string => {
	if (!error) return "Unknown error";
	if (error.message) return error.message;
	return String(error);
};

export default function TestPage() {
	const { ready } = useFilosignContext();
	const logout = useLogout();
	const isLoggedIn = useIsLoggedIn();

	const { add: markDone, has: isDone } = useSet<TestName>();

	return (
		ready && (
			<div className="flex flex-col gap-4">
				<TestLogin notify={markDone} />

				{isLoggedIn.data === true && (
					<div className="space-y-4">
						{isDone("login") && <TestThisUserInfo notify={markDone} />}

						{isDone("check-this-user-info") && (
							<TestOtherUserInfo notify={markDone} />
						)}

						{isDone("check-other-user-info") && (
							<div className="space-y-4">
								<TestFileSend notify={markDone} />
								<ShowReceivedFiles />
								<ShowSentFiles />
							</div>
						)}
					</div>
				)}

				<section className="p-3 sm:p-4 max-w-4xl animate-fade-in">
					<Button mutation={logout}>Logout</Button>
				</section>
			</div>
		)
	);
}

function TestLogin(props: { notify: NotifierFn }) {
	const { notify } = props;

	const login = useLogin();
	const isRegistered = useIsRegistered();
	const isLoggedIn = useIsLoggedIn();
	const userAddress = useCurrentWalletAddress();

	const loginMutation = {
		mutate: () => login.mutate({}),
		isPending: login.isPending,
		isError: login.isError,
		isSuccess: login.isSuccess,
		error: login.error,
	};

	useEffectOnce(() => {
		notify("login");
	}, [login.isSuccess]);
	useEffectOnce(() => {
		if (isLoggedIn.data === true) {
			notify("login");
		}
	}, [isLoggedIn.data]);

	return (
		<section
			className="p-3 sm:p-4 space-y-2 max-w-4xl animate-fade-in contain-layout"
			aria-labelledby="login-heading"
		>
			<SectionHeading id="login-heading" title="Login Test" />

			<div className="flex flex-wrap gap-2 items-center">
				<Button mutation={loginMutation} disabled={isLoggedIn.data === true}>
					{isLoggedIn.data === true
						? "Logged in"
						: login.isPending
							? "Logging in..."
							: "Login"}
				</Button>
				<span className="text-xs text-muted-foreground font-mono break-all">
					{userAddress}
				</span>
			</div>

			{login.isPending && (
				<p
					className="text-muted-foreground animate-pulse-subtle"
					aria-live="polite"
				>
					Logging in...
				</p>
			)}

			{login.isError && (
				<p
					className="text-destructive bg-destructive/10 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Could not log in:</strong> {getErrorMessage(login.error)}
					Please check your connection and try again.
				</p>
			)}

			{login.isSuccess && (
				<p
					className="text-success bg-success/10 p-2 rounded"
					aria-live="polite"
				>
					Login complete. Starting user verification...
				</p>
			)}

			<dl className="grid grid-cols-2 gap-2 text-sm">
				<dt className="text-muted-foreground">Is Registered:</dt>
				<dd>{isRegistered.data ? "Yes" : "No"}</dd>
				<dt className="text-muted-foreground">Is Logged In:</dt>
				<dd>{isLoggedIn.data ? "Yes" : "No"}</dd>
			</dl>
		</section>
	);
}

function TestThisUserInfo(props: { notify: NotifierFn }) {
	const { notify } = props;
	const selfProfile = useUserProfile();

	useEffectOnce(() => {
		if (selfProfile.data) {
			notify("check-this-user-info");
		}
	}, [selfProfile.data]);

	return (
		<section
			className="p-3 sm:p-4 space-y-2 max-w-4xl animate-fade-in contain-layout"
			aria-labelledby="this-user-heading"
		>
			<SectionHeading
				id="this-user-heading"
				title="This User Info"
				className="bg-primary"
			/>

			{selfProfile.isPending && (
				<p
					className="text-muted-foreground animate-pulse-subtle"
					aria-live="polite"
				>
					Loading user profile...
				</p>
			)}

			{selfProfile.isError && (
				<p
					className="text-destructive bg-destructive/10 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Load user profile error:</strong>{" "}
					{getErrorMessage(selfProfile.error)}
				</p>
			)}

			{selfProfile.data && (
				<pre className="bg-card p-3 rounded border overflow-auto max-h-96 text-xs break-all whitespace-pre-wrap">
					{JSON.stringify(selfProfile.data, null, 2)}
				</pre>
			)}
		</section>
	);
}

function TestOtherUserInfo(props: { notify: NotifierFn }) {
	const { notify } = props;
	const otherAddress = useOtherAddress();
	const otherProfile = useUserProfileByQuery({ address: otherAddress });

	useEffectOnce(() => {
		if (otherProfile.data) {
			notify("check-other-user-info");
		}
	}, [otherProfile.data]);

	return (
		<section
			className="p-3 sm:p-4 space-y-2 max-w-4xl animate-fade-in contain-layout"
			aria-labelledby="other-user-heading"
		>
			<SectionHeading
				id="other-user-heading"
				title="Other User Info"
				className="bg-primary"
			/>

			{otherProfile.isPending && (
				<p
					className="text-muted-foreground animate-pulse-subtle"
					aria-live="polite"
				>
					Loading other user profile...
				</p>
			)}

			{otherProfile.isError && (
				<p
					className="text-destructive bg-destructive/10 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Load other user profile error:</strong>{" "}
					{getErrorMessage(otherProfile.error)}
				</p>
			)}

			{otherProfile.data && (
				<pre className="bg-card p-3 rounded border overflow-auto max-h-96 text-xs break-all whitespace-pre-wrap">
					{JSON.stringify(otherProfile.data, null, 2)}
				</pre>
			)}
		</section>
	);
}

function TestFileSend(props: { notify: NotifierFn }) {
	const { notify } = props;
	const otherAddress = useOtherAddress();
	const { data: otherProfile } = useUserProfileByQuery({
		address: otherAddress,
	});
	const { reload: otherReload } = useOtherReload();
	const { setSafeTimeout, clearSafeTimeout } = useTimeout();
	const sendFile = useSendFile();
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
	const [fileError, setFileError] = useState<FileValidationError | null>(null);
	const [fileReadError, setFileReadError] = useState<string | null>(null);
	const inputId = useId();

	useEffectOnce(() => {
		if (sendFile.data) {
			notify("file-send");
			setSafeTimeout(() => {
				otherReload();
			}, RELOAD_DELAY_MS);
		}

		return () => {
			clearSafeTimeout();
		};
	}, [sendFile.data]);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];

		setFileError(null);
		setFileReadError(null);

		if (!file) return;

		const validationError = validateFile(file);
		if (validationError) {
			setFileError(validationError);
			return;
		}

		setSelectedFile(file);

		const reader = new FileReader();

		reader.onload = (e) => {
			const arrayBuffer = e.target?.result;
			if (arrayBuffer instanceof ArrayBuffer) {
				setFileBytes(new Uint8Array(arrayBuffer));
			} else {
				setFileReadError("Failed to read file: invalid data format");
			}
		};

		reader.onerror = () => {
			setFileReadError(
				`Failed to read file: ${reader.error?.message || "Unknown error"}`,
			);
		};

		reader.onabort = () => {
			setFileReadError("File reading was aborted");
		};

		reader.readAsArrayBuffer(file);
	};

	const encryptionPublicKey = useMemo(() => {
		if (!otherProfile?.encryptionPublicKey) return null;
		const key =
			typeof otherProfile.encryptionPublicKey === "string"
				? otherProfile.encryptionPublicKey
				: null;
		return key && /^0x[0-9a-fA-F]+$/.test(key) ? (key as `0x${string}`) : null;
	}, [otherProfile?.encryptionPublicKey]);

	const testPlacementManifest: PlacementManifest = useMemo(
		() => ({
			version: 1,
			documents: [
				{
					id: "test-doc-1",
					name: "test.pdf",
					sha256Plaintext: `0x${"00".repeat(32)}`,
					pageCount: 1,
				},
			],
			fields: [
				{
					id: "test-signature-1",
					documentId: "test-doc-1",
					pageIndex: 0,
					rect: { x: 0.1, y: 0.1, width: 0.2, height: 0.05 },
					assignedRecipientEmail: normalizePlacementRecipientEmail(
						otherProfile?.email ?? "other.signer@test.example",
					),
					required: true,
					type: "signature",
				},
			],
		}),
		[otherAddress, otherProfile?.email],
	);

	if (!otherProfile) {
		return (
			<section
				className="p-3 sm:p-4 space-y-2 max-w-4xl animate-fade-in contain-layout"
				aria-labelledby="file-send-heading"
			>
				<SectionHeading
					id="file-send-heading"
					title="File Send Test"
					className="bg-accent"
				/>
				<p className="text-muted-foreground" aria-live="polite">
					Loading other person profile, please wait...
				</p>
			</section>
		);
	}

	const displayFileName = selectedFile
		? selectedFile.name.length > MAX_FILE_NAME_DISPLAY
			? `${selectedFile.name.slice(0, TRUNCATED_FILE_NAME_LENGTH)}...`
			: selectedFile.name
		: "Default Test File";

	return (
		<section
			className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-4xl animate-fade-in contain-layout"
			aria-labelledby="file-send-heading"
		>
			<SectionHeading
				id="file-send-heading"
				title="File Send Test"
				className="bg-accent"
			/>

			<div>
				<label htmlFor={inputId} className="block text-sm font-medium mb-2">
					Select PDF File (max 10MB):
				</label>
				<input
					id={inputId}
					name="pdf-file"
					type="file"
					accept="application/pdf"
					onChange={handleFileSelect}
					aria-invalid={fileError ? "true" : "false"}
					aria-describedby={fileError ? `${inputId}-error` : `${inputId}-help`}
					className="block w-full text-sm text-foreground
						file:mr-4 file:py-2 file:px-4
						file:rounded-full file:border-0
						file:text-sm file:font-semibold
						file:bg-accent file:text-primary
						hover:file:bg-accent/80
						focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				/>
				<span id={`${inputId}-help`} className="sr-only">
					Accepts PDF files up to 10MB
				</span>

				{fileError && (
					<p
						id={`${inputId}-error`}
						className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded"
						role="alert"
						aria-live="assertive"
					>
						{fileError.message}
					</p>
				)}

				{fileReadError && (
					<p
						className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded"
						role="alert"
						aria-live="assertive"
					>
						{fileReadError}
					</p>
				)}

				{selectedFile && !fileError && !fileReadError && (
					<p className="mt-2 text-sm text-foreground" aria-live="polite">
						Selected:{" "}
						<span className="font-medium break-all">{displayFileName}</span> (
						{(selectedFile.size / 1024).toFixed(2)} KB)
					</p>
				)}
			</div>

			<Button
				mutation={sendFile}
				mutationArgs={{
					bytes: fileBytes || dummyBytes,
					signers: encryptionPublicKey
						? [
								{
									address: otherAddress,
									encryptionPublicKey,
								},
							]
						: [],
					viewers: [],
					metadata: {
						name: selectedFile ? selectedFile.name : "Test File",
					},
					placementManifest: testPlacementManifest,
					viewerEmails: [],
				}}
			>
				Send {displayFileName}
			</Button>
		</section>
	);
}

function ShowReceivedFiles() {
	const receivedFiles = useDocumentsList({ tab: "received" });

	const fileList = useMemo(() => {
		const rows = receivedFiles.data?.items ?? [];
		if (rows.length === 0) return null;
		return rows
			.filter((row) => row.kind === "envelope")
			.map((file) => (
				<li key={file.id}>
					<ReceivedFileItem pieceCid={file.id} />
				</li>
			));
	}, [receivedFiles.data?.items]);

	return (
		<section
			className="p-3 sm:p-4 space-y-2 max-w-4xl animate-fade-in contain-layout"
			aria-labelledby="received-files-heading"
		>
			<SectionHeading
				id="received-files-heading"
				title="Received Files"
				className="bg-accent"
			/>

			{receivedFiles.isPending && (
				<p
					className="text-muted-foreground animate-pulse-subtle"
					aria-live="polite"
				>
					Loading received files...
				</p>
			)}

			{receivedFiles.isError && (
				<p
					className="text-destructive bg-destructive/10 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Load received files error:</strong>{" "}
					{receivedFiles.error instanceof Error
						? receivedFiles.error.message
						: String(receivedFiles.error)}
				</p>
			)}

			{receivedFiles.data && receivedFiles.data.items.length === 0 && (
				<p className="text-muted-foreground italic">No received files.</p>
			)}

			{fileList && <ul className="space-y-2">{fileList}</ul>}
		</section>
	);
}

const ReceivedFileItem = memo(function ReceivedFileItem(props: {
	pieceCid: string;
}) {
	const { pieceCid } = props;
	const { data: file } = useFileInfo({ pieceCid });
	const viewFile = useViewFile();
	const decoder = useMemo(() => new TextDecoder(), []);
	const ackFile = useAckFile();
	const signFile = useSignFile();
	const { setSafeTimeout, clearSafeTimeout } = useTimeout();
	const { reload: otherReload } = useOtherReload();

	useEffectOnce(() => {
		if (signFile.data) {
			setSafeTimeout(() => {
				otherReload();
			}, RELOAD_DELAY_MS);
		}

		return () => {
			clearSafeTimeout();
		};
	}, [signFile.data]);

	const kemCiphertext = parseString(file?.kemCiphertext);
	const encryptedEncryptionKey = parseString(file?.encryptedEncryptionKey);
	const orgKemCiphertext = parseString(file?.orgKemCiphertext);
	const orgEncryptedEncryptionKey = parseString(
		file?.orgEncryptedEncryptionKey,
	);
	const status = parseFileStatus(file?.status);
	const participantKeysReady = Boolean(
		kemCiphertext && encryptedEncryptionKey && status,
	);
	const displayCid = file?.pieceCid.toString() ?? "";
	const truncatedCid =
		displayCid.length > MAX_CID_DISPLAY_LENGTH
			? `${displayCid.slice(0, TRUNCATED_CID_LENGTH)}...`
			: displayCid;

	const currentUserAddress = useCurrentWalletAddress();

	const decodedContent = useMemo(() => {
		if (!viewFile.data?.fileBytes) return null;
		try {
			return decoder.decode(viewFile.data.fileBytes);
		} catch {
			return "[Binary content - cannot display as text]";
		}
	}, [viewFile.data?.fileBytes, decoder]);

	if (!file) {
		return (
			<div className="bg-card p-3 rounded border">
				<p className="text-muted-foreground">Loading file info...</p>
			</div>
		);
	}

	const organizationIdRaw = file.organizationId;
	const organizationId =
		typeof organizationIdRaw === "string"
			? organizationIdRaw.trim().length > 0
				? organizationIdRaw
				: null
			: null;
	const orgVaultReady = Boolean(
		organizationId && orgKemCiphertext && orgEncryptedEncryptionKey && status,
	);
	const canView = participantKeysReady || orgVaultReady;

	return (
		<article className="bg-card p-3 rounded border">
			<dl className="grid grid-cols-[auto,1fr] gap-x-2 sm:gap-x-4 gap-y-1 text-sm mb-3">
				<dt className="text-muted-foreground">File CID:</dt>
				<dd className="break-all font-mono text-xs" title={displayCid}>
					{truncatedCid}
				</dd>

				<dt className="text-muted-foreground">Sender:</dt>
				<dd className="break-all font-mono text-xs">{file.sender}</dd>

				<dt className="text-muted-foreground">Status:</dt>
				<dd>{file.status}</dd>
			</dl>

			<div className="flex flex-wrap gap-2 items-start">
				{canView && participantKeysReady ? (
					<Button
						mutation={viewFile}
						mutationArgs={{
							pieceCid: file.pieceCid,
							kemCiphertext,
							encryptedEncryptionKey,
							status,
						}}
					>
						View File
					</Button>
				) : canView && orgVaultReady && organizationId ? (
					<Button
						mutation={viewFile}
						mutationArgs={{
							variant: "org",
							pieceCid: file.pieceCid,
							organizationId,
							orgKemCiphertext,
							orgEncryptedEncryptionKey,
							status,
						}}
					>
						View File (org)
					</Button>
				) : (
					<Button mutation={ackFile} mutationArgs={{ pieceCid: file.pieceCid }}>
						Acknowledge File
					</Button>
				)}
			</div>

			<div className="mt-3 space-y-2">
				{viewFile.isSuccess && decodedContent && (
					<div className="bg-background p-3 rounded border">
						<h4 className="text-sm font-medium text-muted-foreground mb-2">
							File Content:
						</h4>
						<pre className="text-xs break-all whitespace-pre-wrap overflow-auto max-h-48">
							{decodedContent.length > MAX_CONTENT_DISPLAY_LENGTH
								? `${decodedContent.slice(0, TRUNCATED_CONTENT_LENGTH)}...`
								: decodedContent}
						</pre>
					</div>
				)}

				{canView && file.signatures.length === 0 && currentUserAddress && (
					<div className="mt-2">
						<Button
							mutation={signFile}
							mutationArgs={{
								pieceCid: file.pieceCid,
							}}
						>
							{signFile.isPending ? "Signing…" : "Sign Document"}
						</Button>
					</div>
				)}
				{file.signatures.length > 0 && (
					<span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
						<svg
							className="mr-1.5 size-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
						>
							<title>Signed</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Signed
					</span>
				)}
			</div>
		</article>
	);
});

function ShowSentFiles() {
	const sentFiles = useDocumentsList({ tab: "sent" });

	const fileList = useMemo(() => {
		const rows = sentFiles.data?.items ?? [];
		if (rows.length === 0) return null;
		return rows
			.filter((row) => row.kind === "envelope")
			.map((file) => (
				<li key={file.id}>
					<SentFileItem pieceCid={file.id} />
				</li>
			));
	}, [sentFiles.data?.items]);

	return (
		<section
			className="p-3 sm:p-4 space-y-2 max-w-4xl animate-fade-in contain-layout"
			aria-labelledby="sent-files-heading"
		>
			<SectionHeading
				id="sent-files-heading"
				title="Sent Files"
				className="bg-accent"
			/>

			{sentFiles.isPending && (
				<p
					className="text-muted-foreground animate-pulse-subtle"
					aria-live="polite"
				>
					Loading sent files...
				</p>
			)}

			{sentFiles.isError && (
				<p
					className="text-destructive bg-destructive/10 p-2 rounded wrap-break-word"
					role="alert"
					aria-live="assertive"
				>
					<strong>Load sent files error:</strong>{" "}
					{sentFiles.error instanceof Error
						? sentFiles.error.message
						: String(sentFiles.error)}
				</p>
			)}

			{sentFiles.data && sentFiles.data.items.length === 0 && (
				<p className="text-muted-foreground italic">No sent files.</p>
			)}

			{fileList && <ul className="space-y-2">{fileList}</ul>}
		</section>
	);
}

const SentFileItem = memo(function SentFileItem(props: { pieceCid: string }) {
	const { pieceCid } = props;
	const { data: file } = useFileInfo({ pieceCid });
	const viewFile = useViewFile();
	const decoder = useMemo(() => new TextDecoder(), []);

	const kemCiphertext = parseString(file?.kemCiphertext);
	const encryptedEncryptionKey = parseString(file?.encryptedEncryptionKey);
	const orgKemCiphertext = parseString(file?.orgKemCiphertext);
	const orgEncryptedEncryptionKey = parseString(
		file?.orgEncryptedEncryptionKey,
	);
	const status = parseFileStatus(file?.status);
	const participantKeysReady = Boolean(
		kemCiphertext && encryptedEncryptionKey && status,
	);
	const displayCid = file?.pieceCid.toString() ?? "";
	const truncatedCid =
		displayCid.length > MAX_CID_DISPLAY_LENGTH
			? `${displayCid.slice(0, TRUNCATED_CID_LENGTH)}...`
			: displayCid;

	const decodedContent = useMemo(() => {
		if (!viewFile.data?.fileBytes) return null;
		try {
			return decoder.decode(viewFile.data.fileBytes);
		} catch {
			return "[Binary content - cannot display as text]";
		}
	}, [viewFile.data?.fileBytes, decoder]);

	if (!file) {
		return (
			<div className="bg-card p-3 rounded border">
				<p className="text-muted-foreground">Loading file info...</p>
			</div>
		);
	}

	const organizationIdRaw = file.organizationId;
	const organizationId =
		typeof organizationIdRaw === "string"
			? organizationIdRaw.trim().length > 0
				? organizationIdRaw
				: null
			: null;
	const orgVaultReady = Boolean(
		organizationId && orgKemCiphertext && orgEncryptedEncryptionKey && status,
	);
	const canView = participantKeysReady || orgVaultReady;

	return (
		<article className="bg-card p-3 rounded border">
			<dl className="grid grid-cols-[auto,1fr] gap-x-2 sm:gap-x-4 gap-y-1 text-sm mb-3">
				<dt className="text-muted-foreground">File CID:</dt>
				<dd className="break-all font-mono text-xs" title={displayCid}>
					{truncatedCid}
				</dd>

				<dt className="text-muted-foreground">Sender:</dt>
				<dd className="break-all font-mono text-xs">{file.sender}</dd>

				<dt className="text-muted-foreground">Status:</dt>
				<dd>{file.status}</dd>

				<dt className="text-muted-foreground">Signatures:</dt>
				<dd>{file.signatures.length}</dd>
			</dl>

			{canView && participantKeysReady ? (
				<Button
					mutation={viewFile}
					mutationArgs={{
						pieceCid: file.pieceCid,
						kemCiphertext,
						encryptedEncryptionKey,
						status,
					}}
				>
					View File
				</Button>
			) : canView && orgVaultReady && organizationId ? (
				<Button
					mutation={viewFile}
					mutationArgs={{
						variant: "org",
						pieceCid: file.pieceCid,
						organizationId,
						orgKemCiphertext,
						orgEncryptedEncryptionKey,
						status,
					}}
				>
					View File (org)
				</Button>
			) : (
				<p className="text-sm text-muted-foreground italic">
					Cannot view file (missing required data)
				</p>
			)}

			{viewFile.isSuccess && decodedContent && (
				<div className="mt-3 bg-background p-3 rounded border">
					<h4 className="text-sm font-medium text-muted-foreground mb-2">
						File Content:
					</h4>
					<pre className="text-xs break-all whitespace-pre-wrap overflow-auto max-h-48">
						{decodedContent.length > MAX_CONTENT_DISPLAY_LENGTH
							? `${decodedContent.slice(0, TRUNCATED_CONTENT_LENGTH)}...`
							: decodedContent}
					</pre>
				</div>
			)}
		</article>
	);
});
