import { FileTextIcon } from "@phosphor-icons/react";
import MockBadge from "../kit/MockBadge";
import MockMonoChip from "../kit/MockMonoChip";

type EncryptedDocHeaderProps = {
	filename?: string;
	fieldCount?: number;
	recipients?: readonly string[];
};

export default function EncryptedDocHeader({
	filename = "Contractor_Agreement.pdf",
	fieldCount = 3,
	recipients = ["0xAB…CD", "0x12…89"],
}: EncryptedDocHeaderProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-start gap-3">
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
				<MockBadge className="px-2 py-0.5">Encrypted</MockBadge>
			</div>
			<div className="flex flex-wrap gap-2">
				{recipients.map((address) => (
					<MockMonoChip key={address}>{address}</MockMonoChip>
				))}
			</div>
		</div>
	);
}
