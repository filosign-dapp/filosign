import type { FileInfo } from "@filosign/react/files";
import { useRemindSigners } from "@filosign/react/files";
import { BellRingingIcon } from "@phosphor-icons/react";
import { Button } from "@/src/lib/components/ui/button";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
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
							toastUser.success(TOASTS.reminders.sent(result.remindedCount));
							return;
						}
						if (result.skippedCount > 0) {
							toastUser.message(TOASTS.reminders.alreadySentToday.title, {
								hint: TOASTS.reminders.alreadySentToday.hint,
							});
							return;
						}
						toastUser.message(TOASTS.reminders.noUnsignedSigners);
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
