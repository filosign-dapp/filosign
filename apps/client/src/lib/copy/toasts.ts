/** User-facing toast copy. Title + optional hint only; no internal jargon. */

export const TOASTS = {
	send: {
		selfSignPartialSuccess: {
			title: "Sent",
			hint: "Finish signing from your dashboard.",
		},
		orphanFields: (email: string) => ({
			title: "Fields don't match signers",
			hint: `Add ${email} as a signer or reassign those fields.`,
		}),
		missingFieldsForSigner: (email: string) => ({
			title: "Add a field for each signer",
			hint: `Place at least one field for ${email}.`,
		}),
		missingRequiredSignatureForSigner: (email: string) => ({
			title: "Add a required signature for each signer",
			hint: `Place one required signature field for ${email}.`,
		}),
		invalidSupplementaryFiles: "Check attached files and try again.",
		supplementaryLoadFailed: {
			title: "Couldn't load attached files",
			hint: "Try again in a moment.",
		},
		payoutExceedsBalance: {
			title: "Not enough USDC",
			hint: "Lower payout amounts or add funds to your account.",
		},
		selfSignToggleRequired: {
			title: "Turn on self-sign first",
			hint: 'Enable "I also need to sign" on the form page.',
		},
		addEmailToSelfSign: {
			title: "Add your email to sign",
			hint: "Update it in Account settings.",
		},
		sendFailed: {
			title: "Couldn't send",
			hint: "Try again in a moment.",
		},
	},
	sign: {
		envelopeRecalled: "Sending cancelled",
		completeRequiredFields: {
			title: "Complete required fields",
			hint: "Fill every required field before signing.",
		},
		signatureApplyFailed: {
			title: "Couldn't apply signature",
			hint: "Try again.",
		},
		paymentConfirming: {
			title: "Payment confirming",
			hint: "Wait a moment, then tap Retry if needed.",
		},
		paymentPartial: {
			title: "Some payments sent",
			hint: "Tap Retry for the rest.",
		},
		payoutProcessing: {
			title: "Payout is processing automatically",
			hint: "Usually within a few minutes. You can retry manually later if needed.",
		},
		signaturesCleared: {
			title: "Signatures cleared",
			hint: "Signers need to sign again.",
		},
		sendingCancelled: "Sending cancelled",
		signerChangeProposed: {
			title: "Signer change proposed",
			hint: "Apply it when ready. Signing is paused until then.",
		},
		signerUpdated: "Signer updated",
		signerChangeApplied: {
			title: "Signer change applied",
			hint: "Prior signatures were cleared. Signers must sign again.",
		},
		signerChangeCancelled: "Signer change cancelled",
		payoutAmountsUpdated: {
			title: "Payout amounts updated",
			hint: "Your USDC approval now matches the new combined total.",
		},
		payoutRemoved: {
			title: "Payout removed",
			hint: "Your USDC approval now matches any remaining payouts.",
		},
		payoutAttached: {
			title: "Payout attached",
			hint: "USDC approval completes during attach so payouts can run later.",
		},
		payoutApprovalRevoked: {
			title: "Payout approval revoked",
			hint: "No USDC can leave your account for attached payouts until you approve again.",
		},
		unlockRuleRemoved: "Unlock rule removed",
		supplementaryDownloadSignIn: {
			title: "Sign in to download files",
			hint: "Use the same method you used to open this document.",
		},
		supplementaryDownloadEmail: {
			title: "Add your email",
			hint: "Add an email in Account settings to download attached files.",
		},
		supplementaryDownloadFailed: {
			title: "Download failed",
			hint: "Try again in a moment.",
		},
		supplementaryDownloadStarted: "Download started",
		supplementaryMultiDownload: (count: number) => `Downloading ${count} files`,
		supplementaryDownloading: (count: number) =>
			count === 1 ? "Download started" : `Downloading ${count} files`,
	},
	drafts: {
		uploadFirst: {
			title: "Add a document first",
		},
		unlockBeforeSave: {
			title: "Unlock to save",
			hint: "Enter your recovery phrase if automatic unlock does not work.",
		},
		saveFailed: {
			title: "Couldn't save draft",
			hint: "Try again in a moment.",
		},
		renamed: "Draft renamed",
		deleted: "Draft deleted",
		readyToSave: "Ready to save",
		noDocumentsInDraft: {
			title: "No documents in draft",
		},
		decrypted: "Draft opened",
		decryptFailed: {
			title: "Couldn't open draft",
			hint: "Check your link and try again.",
		},
		keysUnlocked: "Keys unlocked",
		keysUnlocking: {
			title: "Unlocking keys",
			hint: "Try again in a moment.",
		},
	},
	templates: {
		nameRequired: {
			title: "Enter a template name",
		},
		saved: "Saved as template",
		saveFailed: {
			title: "Couldn't save template",
			hint: "Try again.",
		},
		deleted: "Template deleted",
		renamed: "Template renamed",
		selectDraftAndName: {
			title: "Pick a draft and name",
		},
		catalogInstalled: "Catalog template added to workspace",
		created: "Template created",
		cloning: "Copying template…",
		cloned: "Template copied",
		readyForUse: "Ready to use",
		cloneFailed: {
			title: "Couldn't copy template",
			hint: "Try again.",
		},
	},
	workspace: {
		created: "Workspace created",
		checkoutNotCompleted:
			"Checkout was not completed. Choose a plan to try again.",
		inviteSent: "Invite sent",
		joined: "You joined the workspace",
		nameSaved: "Name saved",
		teammateInvited: "Teammate invited",
		treasuryLinked: "Payment wallet linked",
		treasuryRemoved: "Payment wallet removed",
		payoutAccessRequested: "Payout access requested",
	},
	billing: {
		paymentFailed: {
			title: "Payment didn't go through",
			hint: "Update your payment method, then try again.",
		},
		alreadyOnSeats: (count: number) => ({
			title: `Already on ${count} seats`,
		}),
		seatChangeSubmitted: {
			title: "Seat change submitted",
			hint: "Your dashboard updates in 1–2 minutes.",
		},
		planChangeSubmitted: {
			title: "Plan change submitted",
			hint: "Your dashboard updates in 1–2 minutes.",
		},
		planChangeSubmittedShort: "Plan change submitted",
	},
	exports: {
		certificateFailed: {
			title: "Couldn't export certificate",
			hint: "Try again in a moment.",
		},
		signedDocumentFailed: {
			title: "Couldn't export signed document",
			hint: "Try again in a moment.",
		},
		proofDownloadFailed: {
			title: "Couldn't download proof",
			hint: "Try again in a moment.",
		},
		verificationIssue: {
			title: "Export verification issue",
			hint: "Try again or contact support.",
		},
		proofFailedForDoc: (name: string) => ({
			title: "Proof check failed",
			hint: `${name} couldn't be verified. Try downloading again.`,
		}),
		someAttachmentsSkipped: (preview: string, suffix: string) => ({
			title: "Some files weren't included",
			hint: `${preview}${suffix}`,
		}),
		someSignedFilesSkipped: (preview: string, suffix: string) => ({
			title: "Some files weren't included",
			hint: `${preview}${suffix}`,
		}),
	},
	payouts: {
		accessPending: {
			title: "Payout access pending",
			hint: "Check Workspace settings for status.",
		},
		accessRejected: {
			title: "Payout access not approved",
			hint: "Submit a new request in Workspace settings.",
		},
		termsOutdated: {
			title: "Terms updated",
			hint: "Submit a new access request in Workspace settings.",
		},
		accessNone: {
			title: "Request payout access first",
			hint: "Go to Workspace settings → Payout access.",
		},
		accessRequired: {
			title: "Payout access required",
			hint: "Workspace settings → Payout access.",
		},
		settingsHint: "Workspace settings → Payout access",
	},
	reminders: {
		sent: (count: number) =>
			count === 1 ? "Reminder sent" : `Reminders sent to ${count} signers`,
		alreadySentToday: {
			title: "Reminders already sent today",
			hint: "Try again tomorrow.",
		},
		noUnsignedSigners: "Everyone has signed",
	},
	signatures: {
		saved: (role: "signature" | "initial") =>
			role === "signature" ? "Signature saved" : "Initials saved",
		saveFailed: {
			title: "Couldn't save signature",
			hint: "Try again.",
		},
	},
	activation: {
		newTutorials: {
			title: "New tutorials available",
		},
		practiceAcceptFailed: {
			title: "Couldn't accept practice document",
			hint: "Try again.",
		},
		practicePrepareFailed: {
			title: "Couldn't prepare practice document",
			hint: "Try again.",
		},
	},
	admin: {
		inviteCreated: (label: string) => `Invite created for ${label}`,
		inviteSent: (email: string) => `Invite sent to ${email}`,
		inviteReadyNoEmail: (email: string) => ({
			title: `Invite ready for ${email}`,
			hint: "Email delivery is disabled.",
		}),
		inviteReissued: (label: string) => `Invite reissued for ${label}`,
		inviteReissuedGeneric: "Invite reissued",
		checkoutLinkSent: (email: string) => `Checkout link sent to ${email}`,
	},
	auth: {
		partnerTrialFailed: {
			title: "Couldn't activate trial",
			hint: "Check your connection and try again.",
		},
	},
} as const;

/** @deprecated Import from `@/src/lib/copy/toasts` — kept for existing imports. */
export const PAYOUT_EXCEEDS_BALANCE_MESSAGE = `${TOASTS.send.payoutExceedsBalance.title}. ${TOASTS.send.payoutExceedsBalance.hint}`;
