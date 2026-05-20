import { FileTextIcon, FunnelIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Button } from "@/src/lib/components/ui/button";
import { InlineLoader } from "@/src/lib/components/ui/inline-loader";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";
import { FileListSection } from "./file-list-section";

export function DocumentsContent() {
	const {
		isFilterOpen,
		sentFilesData,
		receivedFilesData,
		orgFilesData,
		allFiles,
		isLoading,
	} = useDocuments();

	return (
		<>
			<motion.div
				className="overflow-hidden border-b border-border"
				initial={false}
				animate={{
					height: isFilterOpen ? "auto" : 0,
					opacity: isFilterOpen ? 1 : 0,
				}}
				transition={{
					duration: 0.3,
					ease: "easeInOut",
					opacity: { duration: 0.2 },
				}}
			>
				<div className="px-8 py-4 bg-background/50 backdrop-blur-sm">
					<div className="flex flex-col gap-4 @md:flex-row @md:items-center">
						<div className="flex items-center gap-2">
							<FunnelIcon className="size-4 text-muted-foreground" />
							<span className="text-sm font-medium text-foreground">
								Filters
							</span>
						</div>

						<div className="flex flex-col gap-3 @md:flex-row @md:gap-4 @md:flex-1">
							<Select>
								<SelectTrigger
									className="w-full @md:w-auto @md:min-w-40"
									size="sm"
								>
									<SelectValue placeholder="Sender: All" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="me">Me</SelectItem>
									<SelectItem value="others">Others</SelectItem>
								</SelectContent>
							</Select>

							<Select>
								<SelectTrigger
									className="w-full @md:w-auto @md:min-w-40"
									size="sm"
								>
									<SelectValue placeholder="All Time" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Time</SelectItem>
									<SelectItem value="today">Today</SelectItem>
									<SelectItem value="week">This Week</SelectItem>
									<SelectItem value="month">This Month</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</motion.div>

			<motion.div
				className="flex min-h-0 flex-1 flex-col overflow-y-auto p-8 space-y-8"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2, delay: 0.3 }}
			>
				{isLoading ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 py-24">
						<InlineLoader size="lg" />
						<p className="text-sm text-muted-foreground">Loading documents…</p>
					</div>
				) : allFiles.length === 0 ? (
					<div className="flex min-h-0 flex-1 flex-col items-center justify-center">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.2, delay: 0.4 }}
							className="space-y-4 text-center"
						>
							<div className="size-40 mx-auto mb-6">
								<FileTextIcon
									className="size-full text-muted-foreground/50"
									weight="light"
								/>
							</div>
							<h2 className="font-semibold text-foreground">No documents</h2>
							<p className="max-w-md px-4 text-muted-foreground">
								You have not yet created or received any documents. Get started
								by creating a new document.
							</p>
							<Link to="/dashboard/envelope/create">
								<Button variant="primary" className="gap-2">
									<PlusIcon className="size-4" weight="bold" />
									Create New Document
								</Button>
							</Link>
						</motion.div>
					</div>
				) : (
					<>
						<FileListSection
							title="Received Files"
							files={receivedFilesData}
							prefix="received"
							delay={0.5}
						/>
						<FileListSection
							title="Team documents"
							files={orgFilesData}
							prefix="org"
							delay={0.35}
						/>
						<FileListSection
							title="Sent Files"
							files={sentFilesData}
							prefix="sent"
							delay={0.4}
						/>
					</>
				)}
			</motion.div>
		</>
	);
}
