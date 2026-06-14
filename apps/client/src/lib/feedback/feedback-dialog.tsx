import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useSubmitFeedback } from "@filosign/react/feedback";
import { useActiveOrgId } from "@filosign/react/orgs";
import {
	FEEDBACK_FEATURE_AREAS,
	type FeedbackFeatureArea,
	zFeedbackFeatureArea,
} from "@filosign/shared";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { Button } from "@/src/lib/components/ui/button";
import { Dialog } from "@/src/lib/components/ui/dialog";
import {
	FeatureDialogActions,
	FeatureDialogBody,
	FeatureDialogClose,
	FeatureDialogContent,
	FeatureDialogHeader,
	FeatureDialogMedia,
	FeatureDialogPanel,
} from "@/src/lib/components/ui/feature-dialog";
import { Label } from "@/src/lib/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/src/lib/components/ui/select";
import { Textarea } from "@/src/lib/components/ui/textarea";
import { FEEDBACK_COPY } from "@/src/lib/copy/feedback";
import { toastUser } from "@/src/lib/copy/toast";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
import { feedbackFeatureAreaFromPath } from "@/src/lib/feedback/feature-area";
import { useFeedback } from "@/src/lib/feedback/feedback-provider";
import { recordFeedbackSubmission } from "@/src/lib/feedback/prefs-storage";
import { cn } from "@/src/lib/utils";
import { safeAsync } from "@/src/lib/utils/safe";

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export function FeedbackDialogMount() {
	const titleId = useId();
	const { dialogOpen, setDialogOpen, closeFeedback } = useFeedback();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const activeOrgId = useActiveOrgId();
	const submitFeedback = useSubmitFeedback();
	const captureAppEvent = useCaptureAppEvent();

	const [featureArea, setFeatureArea] = useState<FeedbackFeatureArea>("other");
	const [rating, setRating] = useState<number | null>(null);
	const [message, setMessage] = useState("");

	useEffect(() => {
		if (!dialogOpen) return;
		setFeatureArea(feedbackFeatureAreaFromPath(pathname));
		setRating(null);
		setMessage("");
	}, [dialogOpen, pathname]);

	const trimmedMessage = message.trim();
	const canSubmit = trimmedMessage.length > 0 && !submitFeedback.isPending;

	const handleSubmit = async () => {
		if (!trimmedMessage) return;

		const [result, error] = await safeAsync(() =>
			submitFeedback.mutateAsync({
				featureArea,
				route: pathname,
				rating,
				message: trimmedMessage,
				pieceCid: null,
				promptType: "global",
				trigger: null,
				organizationId: activeOrgId,
				metadata: {},
			}),
		);

		if (error || !result) {
			toastUser.error(FEEDBACK_COPY.errors.submitFailed.title, {
				hint: FEEDBACK_COPY.errors.submitFailed.hint,
			});
			return;
		}

		recordFeedbackSubmission();
		captureAppEvent(CLIENT_ANALYTICS_EVENTS.feedbackSubmitted, {
			feature_area: featureArea,
			rating,
			prompt_type: "global",
			trigger: null,
		});
		toastUser.success(FEEDBACK_COPY.thankYou);
		closeFeedback();
	};

	return (
		<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={FEATURE_DIALOG_IMAGES.feedbackDialog}
					badge={FEEDBACK_COPY.dialog.badge}
				/>

				<FeatureDialogPanel>
					<FeatureDialogClose />

					<FeatureDialogHeader
						badge={FEEDBACK_COPY.dialog.badge}
						title={FEEDBACK_COPY.dialog.title}
						titleId={titleId}
						description={FEEDBACK_COPY.dialog.description}
					/>

					<FeatureDialogBody>
						<div className="flex flex-col gap-5">
							<div className="flex flex-col gap-2">
								<Label htmlFor="feedback-area">
									{FEEDBACK_COPY.dialog.areaLabel}
								</Label>
								<Select
									value={featureArea}
									onValueChange={(value) => {
										const parsed = zFeedbackFeatureArea.safeParse(value);
										if (parsed.success) setFeatureArea(parsed.data);
									}}
								>
									<SelectTrigger id="feedback-area" className="w-full">
										<SelectValue>
											{FEEDBACK_COPY.areas[featureArea]}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{FEEDBACK_FEATURE_AREAS.map((area) => (
											<SelectItem key={area} value={area}>
												{FEEDBACK_COPY.areas[area]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex flex-col gap-2">
								<Label>{FEEDBACK_COPY.dialog.ratingLabel}</Label>
								<div className="flex flex-wrap gap-2">
									{RATING_OPTIONS.map((value) => (
										<Button
											key={value}
											type="button"
											size="sm"
											variant={rating === value ? "primary" : "outline"}
											className={cn("min-w-10 rounded-full px-3")}
											onClick={() =>
												setRating((current) =>
													current === value ? null : value,
												)
											}
										>
											{value}
										</Button>
									))}
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<Label htmlFor="feedback-message">
									{FEEDBACK_COPY.dialog.messageLabel}
								</Label>
								<Textarea
									id="feedback-message"
									value={message}
									onChange={(event) =>
										setMessage(event.target.value.slice(0, 500))
									}
									placeholder={FEEDBACK_COPY.dialog.messagePlaceholder}
									rows={5}
									required
								/>
							</div>
						</div>

						<FeatureDialogActions>
							<Button
								type="button"
								variant="primary"
								size="lg"
								className="w-full"
								disabled={!canSubmit}
								isLoading={submitFeedback.isPending}
								onClick={() => void handleSubmit()}
							>
								{submitFeedback.isPending
									? FEEDBACK_COPY.dialog.submitting
									: FEEDBACK_COPY.dialog.submit}
							</Button>
						</FeatureDialogActions>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
