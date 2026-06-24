export { getPlatformAdminDashboardStats } from "./dashboard-stats";
export {
	assertRegistrationAllowed,
	canStartEmailAuth,
	previewAdminBootstrap,
	previewColdRecipientGate,
	previewPaidSetup,
	previewPlatformInvite,
	previewReturningUserLogin,
	type RegistrationAccessGate,
	resolvePlatformInviteKind,
} from "./gates";
export {
	expirePartnerTrialsJob,
	grantAdminOrgTeamsProIfEligibleWithTx,
	grantDevPlansForAdminEmail,
	setOrgPlanManualWithTx,
	upsertPaidAccessPendingFromWebhook,
} from "./grants";
export {
	createPlatformInvite,
	getPlatformInviteById,
	listPlatformInvites,
	listPlatformUsersForAdmin,
	rebookPlatformInvite,
	revokePlatformInvite,
	setPersonalOrgFeatureOverrides,
	setPersonalOrgPlanManual,
} from "./invites";
export {
	fetchRegisteredUserEmail,
	type RedeemPartnerInviteForExistingUserResult,
	redeemPartnerInviteForExistingUser,
} from "./redeem-existing";
export {
	assertRegistrationComplete,
	attachPartnerTrialOnOrgCreateWithTx,
	attachPartnerTrialToExistingOrgWithTx,
	attachPendingOrgBillingOnCreateWithTx,
	isActivePartnerTrialSubscription,
	isUserRegistered,
	linkPaidSetupOnRegister,
	linkPaidSetupOnRegisterWithTx,
	type PartnerInviteTrialContext,
	type PartnerTrialSubscriptionRow,
	redeemPlatformInviteOnRegister,
	redeemPlatformInviteOnRegisterWithTx,
	resolvePartnerInviteTrialForWorkspace,
} from "./registration";
export {
	approveAccessRequest,
	listAccessRequestsForAdmin,
	rejectAccessRequest,
	submitAccessRequest,
} from "./requests";

export { registerUserAccount } from "./utils/register-user";

export {
	generatePlatformInviteToken,
	generateSetupToken,
	inviteIsActive,
	normalizeEmail,
	type PlatformAccessTx,
	type PlatformGatePreview,
	planLabel,
} from "./utils/shared";
