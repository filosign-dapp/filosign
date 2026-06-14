import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { useSubmitFeedback } from "@filosign/react/feedback";
import { useActiveOrgId } from "@filosign/react/orgs";
import {
	FEEDBACK_FEATURE_AREAS,
	FEEDBACK_KINDS,
	type FeedbackFeatureArea,
	type FeedbackKind,
	zFeedbackFeatureArea,
	zFeedbackKind,
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
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@/src/lib/components/ui/toggle-group";
import { FEEDBACK_COPY, FEEDBACK_SUPPORT_EMAIL } from "@/src/lib/copy/feedback";
import { toastUser } from "@/src/lib/copy/toast";
import { FEATURE_DIALOG_IMAGES } from "@/src/lib/domains/feature-dialog/images";
import { feedbackFeatureAreaFromPath } from "@/src/lib/feedback/feature-area";
import { useFeedback } from "@/src/lib/feedback/feedback-provider";
import { recordFeedbackSubmission } from "@/src/lib/feedback/prefs-storage";
import { safeAsync } from "@/src/lib/utils/safe";

export function FeedbackDialogMount() {
	const titleId = useId();
	const { dialogOpen, initialKind, setDialogOpen, closeFeedback } =
		useFeedback();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const activeOrgId = useActiveOrgId();
	const submitFeedback = useSubmitFeedback();
	const captureAppEvent = useCaptureAppEvent();

	const [kind, setKind] = useState<FeedbackKind>("feedback");
	const [featureArea, setFeatureArea] = useState<FeedbackFeatureArea>("other");
	const [message, setMessage] = useState("");

	const kindCopy = FEEDBACK_COPY.kindDialog[kind];

	useEffect(() => {
		if (!dialogOpen) return;
		setKind(initialKind);
		setFeatureArea(feedbackFeatureAreaFromPath(pathname));
		setMessage("");
	}, [dialogOpen, initialKind, pathname]);

	const trimmedMessage = message.trim();
	const canSubmit = trimmedMessage.length > 0 && !submitFeedback.isPending;

	const handleSubmit = async () => {
		if (!trimmedMessage) return;

		const [result, error] = await safeAsync(() =>
			submitFeedback.mutateAsync({
				kind,
				featureArea,
				route: pathname,
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
			feedback_kind: kind,
			feature_area: featureArea,
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
						title={kindCopy.title}
						titleId={titleId}
						description={kindCopy.description}
					/>

					<FeatureDialogBody>
						<div className="flex flex-col gap-5">
							<div className="flex flex-col gap-2">
								<Label>{FEEDBACK_COPY.dialog.kindLabel}</Label>
								<ToggleGroup
									value={[kind]}
									onValueChange={(values: readonly string[]) => {
										const parsed = zFeedbackKind.safeParse(values[0]);
										if (parsed.success) setKind(parsed.data);
									}}
									variant="outline"
									spacing={0}
									className="flex w-full"
								>
									{FEEDBACK_KINDS.map((value) => (
										<ToggleGroupItem
											key={value}
											value={value}
											className="h-9 flex-1 text-xs font-normal text-muted-foreground/80 transition-all hover:text-foreground data-[state=on]:bg-muted/40 data-[state=on]:text-foreground"
										>
											{FEEDBACK_COPY.kindToggle[value]}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</div>

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
								<Label htmlFor="feedback-message">
									{kindCopy.messageLabel}
								</Label>
								<Textarea
									id="feedback-message"
									value={message}
									onChange={(event) =>
										setMessage(event.target.value.slice(0, 500))
									}
									placeholder={kindCopy.messagePlaceholder}
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
									: kindCopy.submit}
							</Button>
						</FeatureDialogActions>

						<p className="text-center text-xs leading-relaxed text-muted-foreground">
							{FEEDBACK_COPY.dialog.followUpLead}{" "}
							<a
								href={`mailto:${FEEDBACK_SUPPORT_EMAIL}`}
								className="font-medium text-foreground underline underline-offset-4"
							>
								{FEEDBACK_SUPPORT_EMAIL}
							</a>{" "}
							{FEEDBACK_COPY.dialog.followUpAction}
						</p>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
