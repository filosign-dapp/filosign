export type FileViewerFile = {
	pieceCid: string;
	sender: string;
	status: string;
	type?: "sent" | "received";
};

export type FileViewerProps = {
	file: FileViewerFile | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};
