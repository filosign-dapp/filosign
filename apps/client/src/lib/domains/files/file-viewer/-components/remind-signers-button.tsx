import type { FileInfo } from "@filosign/react/files";
import { useRemindSigners } from "@filosign/react/files";
import { BellRingingIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/src/lib/components/ui/button";
import { showAppErrorToast } from "@/src/lib/errors";

const toolbarIconClass = "size-6 @md:size-7";
const toolbarBtnClass =
	"shrink-0 p-0 h-10 w-10 @md:h-11 @md:w-11 text-muted-foreground hover:text-primary-foreground hover:bg-primary/10";

export function RemindSignersButton({
	pieceCid,
	fileInfo,
	isSender,
}: {
	pieceCid: string;
	fileInfo: FileInfo | null | undefined;
	isSender: boolean;
}) {
	const remind = useRemindSigners(pieceCid);

	const progress = fileInfo?.envelopeProgress;
	const canRemind =
		isSender && !progress?.completedAt && !progress?.revokedBeforeCompletedAt;

	if (!canRemind) return null;

	return (
		<Button
			variant="ghost"
			size="sm"
			type="button"
			title="Email unsigned signers"
			disabled={remind.isPending}
			className={toolbarBtnClass}
			onClick={() => {
				void remind.mutateAsync().then(
					(result) => {
						if (result.remindedCount > 0) {
							toast.success(
								result.remindedCount === 1
									? "Reminder sent to 1 signer"
									: `Reminders sent to ${result.remindedCount} signers`,
							);
							return;
						}
						if (result.skippedCount > 0) {
							toast.message(
								"Reminders already sent today — try again tomorrow",
							);
							return;
						}
						toast.message("No unsigned signers to remind");
					},
					(error) => {
						showAppErrorToast(error);
					},
				);
			}}
		>
			<BellRingingIcon className={toolbarIconClass} />
		</Button>
	);
}
