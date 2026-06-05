import {
	CLIENT_ANALYTICS_EVENTS,
	useCaptureAppEvent,
} from "@filosign/react/analytics";
import {
	dataUrlToBytes,
	intrinsicAspectRatioFromBytes,
	renderTypedSignatureSvg,
	svgStringToBytes,
	useCreateUserSignature,
} from "@filosign/react/users";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStorePersist } from "@/src/lib/filosign/use-store";
import { safeAsync } from "@/src/lib/utils/safe";

export function useSignatureCreateController(options?: {
	onboarding?: boolean;
}) {
	const onboarding = options?.onboarding ?? false;
	const navigate = useNavigate();
	const captureAppEvent = useCaptureAppEvent();
	const createSignature = useCreateUserSignature();
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const [firstName, setFirstName] = useState(onboardingForm?.firstName || "");
	const [lastName, setLastName] = useState(onboardingForm?.lastName || "");
	const [initials, setInitials] = useState("");
	const [activeTab, setActiveTab] = useState("choose");
	const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
	const [isInitialsDialogOpen, setIsInitialsDialogOpen] = useState(false);
	const [signatureData, setSignatureData] = useState<string | null>(null);
	const [initialsData, setInitialsData] = useState<string | null>(null);
	const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
		null,
	);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (onboardingForm?.firstName && !firstName) {
			setFirstName(onboardingForm.firstName);
		}
		if (onboardingForm?.lastName && !lastName) {
			setLastName(onboardingForm.lastName);
		}
	}, [
		onboardingForm?.firstName,
		onboardingForm?.lastName,
		firstName,
		lastName,
	]);

	useEffect(() => {
		if (firstName.trim() && lastName.trim()) {
			const generatedInitials =
				`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
			setInitials(generatedInitials);
		} else {
			setInitials("");
		}
	}, [firstName, lastName]);

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
		!selectedSignatureId ||
		!firstName.trim() ||
		!lastName.trim() ||
		!initials.trim();
	const isDrawDisabled = !signatureData || !initialsData;
	const isUploadDisabled = !signatureData || !initialsData;

	const uploadTypedPair = async () => {
		const fullName = `${firstName} ${lastName}`.trim();
		const fontId = selectedSignatureId ?? "typed";

		const sigSvg = renderTypedSignatureSvg({ text: fullName, fontId });
		const initSvg = renderTypedSignatureSvg({
			text: initials,
			fontId,
			width: 200,
			height: 80,
		});

		const sigBytes = svgStringToBytes(sigSvg);
		const initBytes = svgStringToBytes(initSvg);

		await Promise.all([
			createSignature.mutateAsync({
				bytes: sigBytes,
				contentType: "image/svg+xml",
				role: "signature",
				kind: "typed",
				typedMeta: { text: fullName, fontId },
				intrinsicAspectRatio: intrinsicAspectRatioFromBytes(
					sigBytes,
					"image/svg+xml",
					"signature",
				),
			}),
			createSignature.mutateAsync({
				bytes: initBytes,
				contentType: "image/svg+xml",
				role: "initial",
				kind: "typed",
				typedMeta: { text: initials, fontId },
				intrinsicAspectRatio: intrinsicAspectRatioFromBytes(
					initBytes,
					"image/svg+xml",
					"initial",
				),
			}),
		]);
	};

	const uploadDrawOrUploadPair = async () => {
		if (!signatureData || !initialsData) {
			throw new Error("Signature and initials are required");
		}

		const [sigParsed, initParsed] = await Promise.all([
			dataUrlToBytes(signatureData),
			dataUrlToBytes(initialsData),
		]);

		const kind = activeTab === "draw" ? "drawn" : "uploaded";

		await Promise.all([
			createSignature.mutateAsync({
				bytes: sigParsed.bytes,
				contentType: sigParsed.contentType,
				role: "signature",
				kind,
				intrinsicAspectRatio: intrinsicAspectRatioFromBytes(
					sigParsed.bytes,
					sigParsed.contentType,
					"signature",
				),
			}),
			createSignature.mutateAsync({
				bytes: initParsed.bytes,
				contentType: initParsed.contentType,
				role: "initial",
				kind,
				intrinsicAspectRatio: intrinsicAspectRatioFromBytes(
					initParsed.bytes,
					initParsed.contentType,
					"initial",
				),
			}),
		]);
	};

	const handleCreateSignature = () => {
		if (isSaving) return;
		setIsSaving(true);

		void safeAsync(async () => {
			if (activeTab === "choose") {
				await uploadTypedPair();
			} else {
				await uploadDrawOrUploadPair();
			}
			captureAppEvent(CLIENT_ANALYTICS_EVENTS.signatureCreated, {
				source: activeTab,
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

			toast.success("Signature saved");
			await navigate({ to: "/dashboard" });
		}).then(([, err]) => {
			setIsSaving(false);
			if (err) {
				toast.error(
					err instanceof Error ? err.message : "Failed to save signature",
				);
			}
		});
	};

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		setSignatureData(null);
		setInitialsData(null);
		setSelectedSignatureId(null);
	};

	return {
		onboarding,
		firstName,
		setFirstName,
		lastName,
		setLastName,
		initials,
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
		isDrawDisabled,
		isUploadDisabled,
		handleCreateSignature,
		handleTabChange,
		isSaving,
	};
}

export type SignatureCreateController = ReturnType<
	typeof useSignatureCreateController
>;
