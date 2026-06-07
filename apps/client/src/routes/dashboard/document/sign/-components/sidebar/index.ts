export { SignSidebarCollapsibleSection } from "./collapsible-section";
export { SignDocumentSidebar } from "./document-sidebar";
export { SignSidebarFieldsChecklist } from "./fields-checklist";
export { SignSidebarFieldsSheet } from "./fields-sheet";
export { SignSidebarRoot } from "./root";
export { SignSidebarSection } from "./section";
export { SignSidebarSignersList } from "./signers-list";

import { SignSidebarCollapsibleSection } from "./collapsible-section";
import { SignSidebarFieldsChecklist } from "./fields-checklist";
import { SignSidebarFieldsSheet } from "./fields-sheet";
import { SignSidebarRoot } from "./root";
import { SignSidebarSection } from "./section";
import { SignSidebarSignersList } from "./signers-list";

export const SignSidebar = {
	Root: SignSidebarRoot,
	Section: SignSidebarSection,
	FieldsChecklist: SignSidebarFieldsChecklist,
	FieldsSheet: SignSidebarFieldsSheet,
	SignersList: SignSidebarSignersList,
	CollapsibleSection: SignSidebarCollapsibleSection,
};
