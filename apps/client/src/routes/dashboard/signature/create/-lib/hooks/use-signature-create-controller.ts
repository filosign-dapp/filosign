import { useFilosignContext } from "@filosign/react";
import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import { invalidateActivationProgress } from "@filosign/react/invalidate-queries";
import {
	dataUrlToBytes,
	deriveSignatureInitials,
	intrinsicAspectRatioFromBytes,
	rasterizeTypedSignature,
	resolveSignatureFontId,
	useCreateUserSignature,
	useMarkActivationMilestone,
	useUserProfile,
} from "@filosign/react/users";
import type { UserSignatureRole } from "@filosign/shared";
import { DEFAULT_TYPED_SIGNATURE_FONT_ID } from "@filosign/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toastUser } from "@/src/lib/copy/toast";
import { TOASTS } from "@/src/lib/copy/toasts";
import { showAppErrorToast } from "@/src/lib/errors/present-app-error";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { safeAsync } from "@/src/lib/utils/safe";

const PROFILE_SETTINGS_HREF = "/dashboard/settings/profile";

export function useSignatureCreateController(options?: {
	onboarding?: boolean;
}) {
	const onboarding = options?.onboarding ?? false;
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { rpcQuery } = useFilosignContext();
	const captureAppEvent = useCaptureAppEvent();
	const createSignature = useCreateUserSignature();
	const markActivationMilestone = useMarkActivationMilestone();
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const { data: profile } = useUserProfile({ enabled: !onboarding });

	const { firstName, lastName, fullName, initials, hasSignableName } =
		useMemo(() => {
			const resolvedFirst = (
				onboarding
					? (onboardingForm?.firstName ?? "")
					: (profile?.firstName ?? "")
			).trim();
			const resolvedLast = (
				onboarding
					? (onboardingForm?.lastName ?? "")
					: (profile?.lastName ?? "")
			).trim();
			const resolvedFull = `${resolvedFirst} ${resolvedLast}`.trim();
			const resolvedInitials = deriveSignatureInitials(
				resolvedFirst,
				resolvedLast,
			);

			return {
				firstName: resolvedFirst,
				lastName: resolvedLast,
				fullName: resolvedFull,
				initials: resolvedInitials,
				hasSignableName: resolvedFirst.length > 0,
			};
		}, [
			onboarding,
			onboardingForm?.firstName,
			onboardingForm?.lastName,
			profile?.firstName,
			profile?.lastName,
		]);

	const [activeTab, setActiveTab] = useState("choose");
	const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
	const [isInitialsDialogOpen, setIsInitialsDialogOpen] = useState(false);
	const [signatureData, setSignatureData] = useState<string | null>(null);
	const [initialsData, setInitialsData] = useState<string | null>(null);
	const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
		DEFAULT_TYPED_SIGNATURE_FONT_ID,
	);
	const [isSavingChoose, setIsSavingChoose] = useState(false);
	const [savingRole, setSavingRole] = useState<UserSignatureRole | null>(null);

	const handleSignatureSave = (data: string) => {
		setSignatureData(data);
		setIsSignatureDialogOpen(false);
	};

	const handleInitialsSave = (data: string) => {
		setInitialsData(data);
		setIsInitialsDialogOpen(false);
	};

	const handleClearSignature = () => {
		setSignatureData(null);
	};

	const handleClearInitials = () => {
		setInitialsData(null);
	};

	const handleSignatureUpload = (data: string) => {
		setSignatureData(data);
	};

	const handleInitialsUpload = (data: string) => {
		setInitialsData(data);
	};

	const handleSignatureSelection = (styleId: string) => {
		setSignatureData(styleId);
		setInitialsData(initials);
		setSelectedSignatureId(styleId);
		if (onboarding && onboardingForm) {
			setOnboardingForm({
				...onboardingForm,
				selectedSignature: styleId,
			});
		}
	};

	const isChooseDisabled =
		!selectedSignatureId || !hasSignableName || !initials.trim();

	const recordSignatureCreatedMilestone = async () => {
		await markActivationMilestone.mutateAsync("signature_created");
		await invalidateActivationProgress(queryClient, rpcQuery);
	};

	const handleGoBack = useCallback(() => {
		void navigate({ to: onboarding ? "/onboarding" : "/dashboard" });
	}, [navigate, onboarding]);

	const uploadDrawOrUploadRole = async (role: UserSignatureRole) => {
		const data = role === "signature" ? signatureData : initialsData;
		if (!data) {
			throw new Error(
				role === "signature"
					? "Draw or upload a signature first"
					: "Draw or upload initials first",
			);
		}

		const parsed = await dataUrlToBytes(data);
		const kind = activeTab === "draw" ? "drawn" : "uploaded";

		await createSignature.mutateAsync({
			bytes: parsed.bytes,
			contentType: parsed.contentType,
			role,
			kind,
			intrinsicAspectRatio: intrinsicAspectRatioFromBytes(
				parsed.bytes,
				parsed.contentType,
				role,
			),
		});

		if (role === "signature") {
			setSignatureData(null);
		} else {
			setInitialsData(null);
		}
	};

	const handleCreateSignature = () => {
		if (isSavingChoose) return;
		setIsSavingChoose(true);

		void safeAsync(async () => {
			await uploadTypedPair();
			await recordSignatureCreatedMilestone();
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.signatureCreated, {
				source: "choose",
			});

			if (onboarding && onboardingForm) {
				setOnboardingForm({
					...onboardingForm,
					firstName,
					lastName,
					hasOnboarded: true,
				});
				await navigate({ to: "/onboarding" });
				return;
			}

			toastUser.success(TOASTS.signatures.saved("signature"));
		}).then(([, err]) => {
			setIsSavingChoose(false);
			if (err) {
				showAppErrorToast(err);
			}
		});
	};

	const handleSaveDrawOrUploadRole = (role: UserSignatureRole) => {
		if (savingRole) return;
		setSavingRole(role);

		void safeAsync(async () => {
			await uploadDrawOrUploadRole(role);
			if (role === "signature") {
				await recordSignatureCreatedMilestone();
			}
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.signatureCreated, {
				source: activeTab,
				role,
			});

			if (onboarding && onboardingForm && role === "signature") {
				setOnboardingForm({
					...onboardingForm,
					firstName,
					lastName,
					hasOnboarded: true,
				});
				await navigate({ to: "/onboarding" });
				return;
			}

			toastUser.success(TOASTS.signatures.saved(role));
		}).then(([, err]) => {
			setSavingRole(null);
			if (err) {
				showAppErrorToast(err);
			}
		});
	};

	const uploadTypedPair = async () => {
		const fontId = resolveSignatureFontId(
			selectedSignatureId ?? DEFAULT_TYPED_SIGNATURE_FONT_ID,
		);

		const [sigBytes, initBytes] = await Promise.all([
			rasterizeTypedSignature({
				text: fullName,
				fontId,
				role: "signature",
			}),
			rasterizeTypedSignature({
				text: initials,
				fontId,
				role: "initial",
			}),
		]);

		await Promise.all([
			createSignature.mutateAsync({
				bytes: sigBytes,
				contentType: "image/png",
				role: "signature",
				kind: "typed",
				typedMeta: { text: fullName, fontId },
				intrinsicAspectRatio: intrinsicAspectRatioFromBytes(
					sigBytes,
					"image/png",
					"signature",
				),
			}),
			createSignature.mutateAsync({
				bytes: initBytes,
				contentType: "image/png",
				role: "initial",
				kind: "typed",
				typedMeta: { text: initials, fontId },
				intrinsicAspectRatio: intrinsicAspectRatioFromBytes(
					initBytes,
					"image/png",
					"initial",
				),
			}),
		]);
	};

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		setSignatureData(null);
		setInitialsData(null);
		setSelectedSignatureId(
			value === "choose" ? DEFAULT_TYPED_SIGNATURE_FONT_ID : null,
		);
	};

	return {
		onboarding,
		firstName,
		lastName,
		fullName,
		initials,
		hasSignableName,
		profileSettingsHref: PROFILE_SETTINGS_HREF,
		selectedSignatureId,
		signatureData,
		initialsData,
		isSignatureDialogOpen,
		setIsSignatureDialogOpen,
		isInitialsDialogOpen,
		setIsInitialsDialogOpen,
		handleSignatureSave,
		handleInitialsSave,
		handleClearSignature,
		handleClearInitials,
		handleSignatureUpload,
		handleInitialsUpload,
		handleSignatureSelection,
		isChooseDisabled,
		handleCreateSignature,
		handleSaveDrawOrUploadRole,
		handleTabChange,
		handleGoBack,
		isSavingChoose,
		savingRole,
	};
}

export type SignatureCreateController = ReturnType<
	typeof useSignatureCreateController
>;
