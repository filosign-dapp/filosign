import type { UserSignatureRole } from "@filosign/shared";
import { useRef } from "react";
import { type Editor, Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/src/lib/components/ui/dialog";
import {
	exportSignatureSvgFromEditor,
	svgToDataUrl,
} from "@/src/routes/dashboard/signature/create/-lib/utils/signature-svg";

interface SignatureDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onSave: (signatureData: string) => void;
	title: string;
	signatureRole: UserSignatureRole;
}

export default function SignatureDialog({
	isOpen,
	onClose,
	onSave,
	title,
	signatureRole,
}: SignatureDialogProps) {
	const editorRef = useRef<Editor | null>(null);

	const handleSave = async () => {
		if (!editorRef.current) {
			console.error("Editor not found");
			return;
		}

		try {
			const svg = await exportSignatureSvgFromEditor(
				editorRef.current,
				signatureRole,
			);
			onSave(svgToDataUrl(svg));
			onClose();
		} catch (error) {
			console.error("Error saving signature:", error);
			alert(
				error instanceof Error
					? error.message
					: "Error saving signature. Please try again.",
			);
		}
	};

	const handleClear = () => {
		if (editorRef.current) {
			const shapes = editorRef.current.getCurrentPageShapes();
			if (shapes.length > 0) {
				const shapeIds = shapes.map((shape) => shape.id);
				editorRef.current.deleteShapes(shapeIds);
			}
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-7xl h-[50vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center justify-between">
						{title}
						<Button variant="ghost" size="icon" onClick={onClose}>
							<XIcon className="w-4 h-4" />
						</Button>
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 border rounded-lg overflow-hidden w-full h-full">
					<Tldraw
						onMount={(editor) => {
							editorRef.current = editor;
							editor.setCurrentTool("draw");
						}}
						hideUi={true}
					/>
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={handleClear}>
						Clear
					</Button>
					<Button variant="primary" onClick={handleSave}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
