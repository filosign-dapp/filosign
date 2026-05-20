import { motion } from "motion/react";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";
import FileCard from "./file-card";

type FileRow = {
	pieceCid: string;
	[key: string]: unknown;
};

export function FileListSection({
	title,
	files,
	prefix,
	delay,
}: {
	title: string;
	files: FileRow[];
	prefix: "received" | "org" | "sent";
	delay: number;
}) {
	const { viewMode, handleItemClick, fileInfoByPieceCid } = useDocuments();

	if (files.length === 0) return null;

	return (
		<motion.div
			className="space-y-4"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay }}
		>
			<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
				{title} ({files.length})
			</h3>
			{viewMode === "list" ? (
				<div className="space-y-2">
					{files.map((file) => (
						<FileCard
							key={`${prefix}-${file.pieceCid}`}
							file={file}
							fileInfo={fileInfoByPieceCid.get(file.pieceCid)}
							onClick={handleItemClick}
							variant="list"
						/>
					))}
				</div>
			) : (
				<div className="grid grid-cols-4 @xl:grid-cols-5 @2xl:grid-cols-6 @3xl:grid-cols-8 @5xl:grid-cols-10 gap-3">
					{files.map((file) => (
						<FileCard
							key={`${prefix}-${file.pieceCid}`}
							file={file}
							fileInfo={fileInfoByPieceCid.get(file.pieceCid)}
							onClick={handleItemClick}
							variant="grid"
						/>
					))}
				</div>
			)}
		</motion.div>
	);
}
