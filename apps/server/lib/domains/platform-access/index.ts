export {
	assertRegistrationAllowed,
	canStartEmailAuth,
	previewAdminBootstrap,
	previewColdRecipientGate,
	previewPaidSetup,
	previewPlatformInvite,
	previewReturningUserLogin,
	type RegistrationAccessGate,
} from "./gates";

export {
	expirePartnerTrialsJob,
	grantAdminOrgTeamsProIfEligibleWithTx,
	grantAdminUserTeamsProIfEligibleWithTx,
	grantDevPlansForAdminEmail,
	setOrgPlanManualWithTx,
	setUserPlanManualWithTx,
	upsertPaidAccessPendingFromWebhook,
} from "./grants";

export {
	createPlatformInvite,
	listPlatformInvites,
	listPlatformUsersForAdmin,
	rebookPlatformInvite,
	revokePlatformInvite,
	setUserFeatureOverrides,
	setUserPlanManual,
} from "./invites";

export {
	assertPlatformAccess,
	assertRegistrationComplete,
	attachPendingOrgBillingOnCreateWithTx,
	isUserRegistered,
	linkPaidSetupOnRegister,
	linkPaidSetupOnRegisterWithTx,
	redeemPlatformInviteOnRegister,
	redeemPlatformInviteOnRegisterWithTx,
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
