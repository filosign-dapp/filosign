import { getPlanName, PLAN_PRICING } from "@filosign/entitlements";
import {
	type OrgCheckoutPlanId,
	useCreateNewWorkspaceCheckoutSession,
	useNewWorkspacePendingStatus,
} from "@filosign/react/billing";
import {
	useCreateOrganization,
	useInviteOrgMember,
	useOrganizations,
} from "@filosign/react/orgs";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useState } from "react";
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
import { Input } from "@/src/lib/components/ui/input";
import { Label } from "@/src/lib/components/ui/label";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { PLAN_LIMIT_COPY } from "@/src/lib/domains/entitlements/plan-limit-copy";
import { upgradePlanLimitMedia } from "@/src/lib/domains/feature-dialog/images";
import {
	clearNewWorkspacePending,
	newWorkspaceReturnUrl,
	readNewWorkspacePendingFromUrl,
	setNewWorkspacePending,
	stripNewWorkspaceReturnParams,
} from "@/src/lib/domains/workspace/new-workspace-pending";
import { showAppErrorToast, suppressGlobalErrorToast } from "@/src/lib/errors";
import { useSetPersistedActiveOrganizationId } from "@/src/lib/filosign/persisted-active-org";
import { cn } from "@/src/lib/utils/index";

const CHECKOUT_PLANS: OrgCheckoutPlanId[] = ["teams", "teams_pro"];

export function useCreateWorkspacePendingFromUrl() {
	const [pendingBillingId, setPendingBillingId] = useState<string | null>(null);

	const clearPending = useCallback(() => {
		clearNewWorkspacePending();
		setPendingBillingId(null);
	}, []);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("createWorkspace") !== "1") return;

		const pending = readNewWorkspacePendingFromUrl(params);
		if (pending) {
			setNewWorkspacePending(pending);
			setPendingBillingId(pending);
		}

		stripNewWorkspaceReturnParams(params);
		const next = `${window.location.pathname}${params.size ? `?${params}` : ""}`;
		window.history.replaceState({}, "", next);
	}, []);

	return { pendingBillingId, clearPending };
}

function NewWorkspaceCheckoutDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const titleId = useId();
	const checkout = useCreateNewWorkspaceCheckoutSession();
	const copy = PLAN_LIMIT_COPY["features.workspace.create"];
	const media = upgradePlanLimitMedia("features.workspace.create");
	const [selectedPlan, setSelectedPlan] = useState<OrgCheckoutPlanId>("teams");
	const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
	const [seatCount, setSeatCount] = useState(2);

	const getPrice = (planId: OrgCheckoutPlanId) =>
		interval === "yearly"
			? PLAN_PRICING[planId].yearly
			: PLAN_PRICING[planId].monthly;

	const handleCheckout = async () => {
		try {
			const result = await checkout.mutateAsync(
				{
					planId: selectedPlan,
					interval,
					seatCount,
					returnUrl: newWorkspaceReturnUrl(
						window.location.origin,
						window.location.pathname,
					),
				},
				suppressGlobalErrorToast(),
			);
			window.location.href = result.checkoutUrl;
		} catch (err) {
			showAppErrorToast(err);
		}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia src={media.src} badge={media.badge} />
				<FeatureDialogPanel>
					<FeatureDialogClose disabled={checkout.isPending} />
					<FeatureDialogHeader
						title={copy.title}
						titleId={titleId}
						description={copy.description}
					/>
					<FeatureDialogBody className="overflow-y-auto">
						<div className="mx-auto flex max-w-60 justify-center rounded-lg border border-border/60 bg-muted/40 p-1">
							{(["monthly", "yearly"] as const).map((value) => (
								<button
									key={value}
									type="button"
									onClick={() => setInterval(value)}
									className={cn(
										"flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition",
										interval === value
											? "bg-background text-foreground shadow-xs"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{value === "yearly" ? "Yearly (-15%)" : "Monthly"}
								</button>
							))}
						</div>
						<div className="space-y-2">
							{CHECKOUT_PLANS.map((planId) => (
								<button
									key={planId}
									type="button"
									onClick={() => setSelectedPlan(planId)}
									className={cn(
										"flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition",
										selectedPlan === planId
											? "border-primary bg-primary/5 ring-1 ring-primary"
											: "border-border/60 hover:border-border hover:bg-muted/10",
									)}
								>
									<div>
										<span className="text-sm font-semibold">
											{getPlanName(planId)}
										</span>
										<span className="mt-0.5 block text-xs text-muted-foreground">
											Billed on this workspace
										</span>
									</div>
									<span className="text-sm font-bold tabular-nums">
										${getPrice(planId)}/mo
									</span>
								</button>
							))}
						</div>
						<div className="space-y-2 rounded-xl border border-border/40 bg-muted/10 p-4">
							<Label htmlFor="new-ws-seats">Workspace seats</Label>
							<Input
								id="new-ws-seats"
								type="number"
								min={1}
								max={100}
								value={seatCount}
								onChange={(e) =>
									setSeatCount(
										Math.max(1, Number.parseInt(e.target.value, 10) || 1),
									)
								}
								className="h-9 w-20"
							/>
						</div>
						<FeatureDialogActions>
							<Button
								type="button"
								variant="primary"
								size="lg"
								className="w-full gap-1.5"
								disabled={checkout.isPending}
								isLoading={checkout.isPending}
								onClick={() => void handleCheckout()}
							>
								Continue to checkout
								<ArrowSquareOutIcon
									className="size-4"
									weight="bold"
									aria-hidden
								/>
							</Button>
							<Button
								type="button"
								variant="outline"
								size="lg"
								className="w-full"
								onClick={() => props.onOpenChange(false)}
								disabled={checkout.isPending}
							>
								Cancel
							</Button>
						</FeatureDialogActions>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}

function ConfirmingWorkspacePaymentDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pendingBillingId: string;
	onReady: () => void;
	onAbandoned: () => void;
	onDismiss: () => void;
}) {
	const titleId = useId();
	const pendingStatus = useNewWorkspacePendingStatus(
		props.pendingBillingId,
		props.open,
	);
	const [timedOut, setTimedOut] = useState(false);
	const [pollCycles, setPollCycles] = useState(0);

	useEffect(() => {
		if (!props.open) {
			setTimedOut(false);
			setPollCycles(0);
			return;
		}
		const timer = window.setTimeout(() => setTimedOut(true), 45_000);
		return () => window.clearTimeout(timer);
	}, [props.open, props.pendingBillingId]);

	useEffect(() => {
		if (!props.open || pendingStatus.isFetching) return;
		setPollCycles((count) => count + 1);
	}, [props.open, pendingStatus.isFetching, pendingStatus.dataUpdatedAt]);

	useEffect(() => {
		if (pendingStatus.data?.ready) {
			props.onReady();
		}
	}, [pendingStatus.data?.ready, props.onReady]);

	useEffect(() => {
		if (pendingStatus.data?.abandoned) {
			toastUser.error(TOASTS.workspace.checkoutNotCompleted);
			props.onAbandoned();
		}
	}, [pendingStatus.data?.abandoned, props.onAbandoned]);

	const showRetry =
		timedOut ||
		(pollCycles > 0 &&
			!pendingStatus.data?.ready &&
			!pendingStatus.isFetching &&
			!pendingStatus.data?.abandoned);

	const media = upgradePlanLimitMedia("features.workspace.create");

	const handleDismiss = () => {
		props.onDismiss();
		props.onOpenChange(false);
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) handleDismiss();
				else props.onOpenChange(open);
			}}
		>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia src={media.src} badge={media.badge} />
				<FeatureDialogPanel>
					<FeatureDialogClose
						disabled={pendingStatus.isFetching && !timedOut}
					/>
					<FeatureDialogHeader
						title={
							timedOut ? "Payment is still processing" : "Confirming payment…"
						}
						titleId={titleId}
						description={
							timedOut
								? "Your payment may still be syncing. Wait a moment, then try again."
								: "Hang tight while we confirm your subscription. This usually takes a few seconds."
						}
					/>
					<FeatureDialogBody>
						<FeatureDialogActions>
							{showRetry ? (
								<>
									<Button
										type="button"
										variant="primary"
										size="lg"
										className="w-full"
										isLoading={pendingStatus.isFetching}
										onClick={() => {
											if (timedOut) {
												void pendingStatus.refetch();
												return;
											}
											handleDismiss();
										}}
									>
										{timedOut ? "Check again" : "Start checkout again"}
									</Button>
									<Button
										type="button"
										variant="outline"
										size="lg"
										className="w-full"
										onClick={handleDismiss}
									>
										Close
									</Button>
								</>
							) : (
								<Button
									type="button"
									variant="outline"
									size="lg"
									className="w-full"
									onClick={handleDismiss}
								>
									Cancel
								</Button>
							)}
						</FeatureDialogActions>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}

export function CreateWorkspaceDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pendingBillingId?: string | null;
}) {
	const titleId = useId();
	const createOrg = useCreateOrganization();
	const setActiveOrg = useSetPersistedActiveOrganizationId();
	const [name, setName] = useState("");

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		try {
			const res = await createOrg.mutateAsync(
				{
					name: name.trim(),
					...(props.pendingBillingId
						? { pendingBillingId: props.pendingBillingId }
						: {}),
				},
				suppressGlobalErrorToast(),
			);
			if (res?.organization?.id) {
				setActiveOrg(res.organization.id);
				clearNewWorkspacePending();
				toastUser.success(TOASTS.workspace.created);
				props.onOpenChange(false);
				setName("");
			}
		} catch (err) {
			showAppErrorToast(err);
		}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={upgradePlanLimitMedia("features.workspace.create").src}
					badge="New workspace"
				/>
				<FeatureDialogPanel>
					<FeatureDialogClose disabled={createOrg.isPending} />
					<FeatureDialogHeader
						title="Name your workspace"
						titleId={titleId}
						description="Choose a name for your new workspace. Billing is already attached from checkout."
					/>
					<FeatureDialogBody>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="create-workspace-name">Workspace name</Label>
								<Input
									id="create-workspace-name"
									placeholder="Acme Corp"
									value={name}
									onChange={(e) => setName(e.target.value)}
									autoFocus
									disabled={createOrg.isPending}
								/>
							</div>
							<FeatureDialogActions>
								<Button
									type="submit"
									variant="primary"
									size="lg"
									className="w-full"
									disabled={createOrg.isPending || !name.trim()}
									isLoading={createOrg.isPending}
								>
									{createOrg.isPending ? "Creating…" : "Create workspace"}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="lg"
									className="w-full"
									onClick={() => props.onOpenChange(false)}
									disabled={createOrg.isPending}
								>
									Cancel
								</Button>
							</FeatureDialogActions>
						</form>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}

export function CreateWorkspaceFlow(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: orgsData } = useOrganizations();
	const requiresPaid =
		orgsData?.requiresPaidPlanToCreate ??
		(orgsData?.organizations.filter((o) => o.role === "owner").length ?? 0) >=
			1;
	const { pendingBillingId: pendingFromUrl, clearPending } =
		useCreateWorkspacePendingFromUrl();
	const [checkoutOpen, setCheckoutOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [createOpen, setCreateOpen] = useState(false);
	const [pendingReady, setPendingReady] = useState(false);
	const handlePendingReady = useCallback(() => setPendingReady(true), []);
	const handlePendingAbandoned = useCallback(() => {
		clearPending();
		setPendingReady(false);
		setConfirmOpen(false);
		setCheckoutOpen(true);
	}, [clearPending]);
	const handlePendingDismiss = useCallback(() => {
		clearPending();
		setPendingReady(false);
	}, [clearPending]);

	useEffect(() => {
		if (!props.open) {
			setCheckoutOpen(false);
			setConfirmOpen(false);
			setCreateOpen(false);
			setPendingReady(false);
			return;
		}
		if (pendingFromUrl) {
			if (pendingReady) {
				setCreateOpen(true);
				setConfirmOpen(false);
				setCheckoutOpen(false);
				return;
			}
			setConfirmOpen(true);
			setCreateOpen(false);
			setCheckoutOpen(false);
			return;
		}
		if (requiresPaid) {
			setCheckoutOpen(true);
			setCreateOpen(false);
			setConfirmOpen(false);
			return;
		}
		setCreateOpen(true);
		setCheckoutOpen(false);
		setConfirmOpen(false);
	}, [props.open, requiresPaid, pendingFromUrl, pendingReady]);

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setCheckoutOpen(false);
			setConfirmOpen(false);
			setCreateOpen(false);
			setPendingReady(false);
			clearPending();
		}
		props.onOpenChange(open);
	};

	return (
		<>
			<NewWorkspaceCheckoutDialog
				open={checkoutOpen}
				onOpenChange={(open) => {
					setCheckoutOpen(open);
					if (!open) handleOpenChange(false);
				}}
			/>
			{pendingFromUrl ? (
				<ConfirmingWorkspacePaymentDialog
					open={confirmOpen}
					onOpenChange={(open) => {
						setConfirmOpen(open);
						if (!open) handleOpenChange(false);
					}}
					pendingBillingId={pendingFromUrl}
					onReady={handlePendingReady}
					onAbandoned={handlePendingAbandoned}
					onDismiss={handlePendingDismiss}
				/>
			) : null}
			<CreateWorkspaceDialog
				open={createOpen}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) handleOpenChange(false);
				}}
				pendingBillingId={pendingFromUrl}
			/>
		</>
	);
}

export function InviteTeammateDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const titleId = useId();
	const inviteMember = useInviteOrgMember();
	const [email, setEmail] = useState("");

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!email.trim()) return;
		try {
			await inviteMember.mutateAsync({ email: email.trim() });
			toastUser.success(TOASTS.workspace.teammateInvited);
			setEmail("");
			props.onOpenChange(false);
		} catch {}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<FeatureDialogContent aria-labelledby={titleId}>
				<FeatureDialogMedia
					src={upgradePlanLimitMedia("features.workspace.create").src}
					badge="Invite teammate"
				/>
				<FeatureDialogPanel>
					<FeatureDialogClose disabled={inviteMember.isPending} />
					<FeatureDialogHeader
						title="Invite teammate to workspace"
						titleId={titleId}
						description="Enter your teammate's email address. Once they register or login, they will be automatically added to this workspace."
					/>
					<FeatureDialogBody>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="invite-teammate-email">Email address</Label>
								<Input
									id="invite-teammate-email"
									type="email"
									placeholder="colleague@company.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									autoFocus
									disabled={inviteMember.isPending}
								/>
							</div>
							<FeatureDialogActions>
								<Button
									type="submit"
									variant="primary"
									size="lg"
									className="w-full"
									disabled={inviteMember.isPending || !email.includes("@")}
									isLoading={inviteMember.isPending}
								>
									{inviteMember.isPending ? "Inviting…" : "Invite"}
								</Button>
								<Button
									type="button"
									variant="outline"
									size="lg"
									className="w-full"
									onClick={() => props.onOpenChange(false)}
									disabled={inviteMember.isPending}
								>
									Cancel
								</Button>
							</FeatureDialogActions>
						</form>
					</FeatureDialogBody>
				</FeatureDialogPanel>
			</FeatureDialogContent>
		</Dialog>
	);
}
