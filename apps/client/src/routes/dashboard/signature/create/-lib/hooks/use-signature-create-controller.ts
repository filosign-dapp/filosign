import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStorePersist } from "@/src/lib/filosign/use-store";

export function useSignatureCreateController(options?: {
	onboarding?: boolean;
}) {
	const onboarding = options?.onboarding ?? false;
	const navigate = useNavigate();
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const [firstName, setFirstName] = useState(onboardingForm?.firstName || "");
	const [lastName, setLastName] = useState(onboardingForm?.lastName || "");
	const [initials, setInitials] = useState("");
	const [_activeTab, setActiveTab] = useState("choose");
	const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
	const [isInitialsDialogOpen, setIsInitialsDialogOpen] = useState(false);
	const [signatureData, setSignatureData] = useState<string | null>(null);
	const [initialsData, setInitialsData] = useState<string | null>(null);
	const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
		null,
	);

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

	const handleCreateSignature = () => {
		if (onboarding && onboardingForm) {
			setOnboardingForm({
				...onboardingForm,
				firstName,
				lastName,
				hasOnboarded: true,
			});
			void navigate({ to: "/onboarding" });
		}
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
	};
}

export type SignatureCreateController = ReturnType<
	typeof useSignatureCreateController
>;
