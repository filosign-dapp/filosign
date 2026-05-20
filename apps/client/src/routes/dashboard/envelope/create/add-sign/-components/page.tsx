import type { AddSignController } from "@/src/routes/dashboard/envelope/create/add-sign/-lib/hooks/use-controller";
import { AddSign } from "./ui";

type AddSignaturePageProps = {
	controller: AddSignController;
};

export function AddSignaturePage({ controller }: AddSignaturePageProps) {
	return (
		<AddSign.Root controller={controller}>
			<AddSign.Shell>
				<AddSign.HeaderRow />
				<AddSign.Workspace>
					<AddSign.FieldsSidebar />
					<AddSign.Viewer />
					<AddSign.Thumbnails />
				</AddSign.Workspace>
				<AddSign.MobileToolbar />
				<AddSign.Dialogs />
			</AddSign.Shell>
		</AddSign.Root>
	);
}
