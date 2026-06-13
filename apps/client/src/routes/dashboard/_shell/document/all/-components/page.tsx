import { Tabs } from "@/src/lib/components/ui/tabs";
import { useDocuments } from "@/src/routes/dashboard/_shell/document/all/-lib/context/context";
import { parseDocumentTab } from "@/src/routes/dashboard/_shell/document/all/-lib/hooks/use-documents-controller";
import { DocumentsContent } from "./documents-content";
import { DocumentsPageToolbar } from "./documents-page-toolbar";

export function DocumentsAllPage() {
	const { activeTab, setActiveTab } = useDocuments();

	return (
		<Tabs
			value={activeTab}
			onValueChange={(val) => {
				const tab = parseDocumentTab(val);
				if (tab) setActiveTab(tab);
			}}
			className="flex min-h-0 flex-1 flex-col bg-background @container"
		>
			<DocumentsPageToolbar />
			<DocumentsContent />
		</Tabs>
	);
}
