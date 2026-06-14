import { FileTextIcon } from "@phosphor-icons/react";
import MockBadge from "../kit/MockBadge";
import MockRecipientChip from "../kit/MockRecipientChip";
import { mockPersonas } from "../tokens";

type EncryptedDocHeaderProps = {
	filename?: string;
	fieldCount?: number;
	recipients?: readonly string[];
};

export default function EncryptedDocHeader({
	filename = "Contractor_Agreement.pdf",
	fieldCount = 3,
	recipients = [mockPersonas.alice.email, mockPersonas.bob.email],
}: EncryptedDocHeaderProps) {
	return (
		<div className="min-w-0 space-y-4">
			<div className="flex min-w-0 items-start gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<FileTextIcon className="size-5" weight="fill" aria-hidden />
				</div>
				<div className="min-w-0 flex-1">
					<div className="truncate font-manrope text-sm font-medium">
						{filename}
					</div>
					<div className="font-manrope text-xs text-muted-foreground">
						{fieldCount} signature fields
					</div>
				</div>
				<MockBadge className="shrink-0 px-2 py-0.5">Encrypted</MockBadge>
			</div>
			<div className="flex flex-wrap gap-2">
				{recipients.map((email) => (
					<MockRecipientChip key={email}>{email}</MockRecipientChip>
				))}
			</div>
		</div>
	);
}
