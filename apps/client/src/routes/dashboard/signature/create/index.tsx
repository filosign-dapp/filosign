import {
	CaretLeftIcon,
	PaintBrushIcon,
	UploadIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Image } from "@/src/lib/components/shared/Image";
import Logo from "@/src/lib/components/shared/Logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/src/lib/components/ui/tabs";
import { useStorePersist } from "@/src/lib/hooks/use-store";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";
import SignatureDialog from "./-components/SignatureDialog";
import SignatureDraw from "./-components/SignatureDraw";
import SignatureUpload from "./-components/SignatureUpload";

export function CreateNewSignaturePage({
	onboarding,
}: {
	onboarding?: boolean;
}) {
	const navigate = useNavigate();
	const { onboardingForm, setOnboardingForm } = useStorePersist();
	const [firstName, setFirstName] = useState(onboardingForm?.firstName || "");
	const [lastName, setLastName] = useState(onboardingForm?.lastName || "");
	const [initials, setInitials] = useState("");

	// Sync names from onboarding form when it changes (only if local state is empty)
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

	// Auto-generate initials from first and last names
	useEffect(() => {
		if (firstName.trim() && lastName.trim()) {
			const generatedInitials =
				`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
			setInitials(generatedInitials);
		} else {
			setInitials("");
		}
	}, [firstName, lastName]);

	// Tab state
	const [_activeTab, setActiveTab] = useState("choose");

	// Dialog states
	const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
	const [isInitialsDialogOpen, setIsInitialsDialogOpen] = useState(false);

	// Signature data
	const [signatureData, setSignatureData] = useState<string | null>(null);
	const [initialsData, setInitialsData] = useState<string | null>(null);

	// Selected signature from options
	const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
		null,
	);

	// Handle signature save
	const handleSignatureSave = (data: string) => {
		setSignatureData(data);
		setIsSignatureDialogOpen(false);
	};

	// Handle initials save
	const handleInitialsSave = (data: string) => {
		setInitialsData(data);
		setIsInitialsDialogOpen(false);
	};

	// Handle clear signature
	const handleClearSignature = () => {
		setSignatureData(null);
	};

	// Handle clear initials
	const handleClearInitials = () => {
		setInitialsData(null);
	};

	// Handle signature selection from options
	const _handleSignatureSelection = (selectedSignatureId: string) => {
		setSignatureData(selectedSignatureId);
		setInitialsData(initials);
		setSelectedSignatureId(selectedSignatureId);
		if (onboarding && onboardingForm) {
			setOnboardingForm({
				...onboardingForm,
				selectedSignature: selectedSignatureId,
			});
		}
	};

	// Handle file uploads
	const handleSignatureUpload = (data: string) => {
		setSignatureData(data);
	};

	const handleInitialsUpload = (data: string) => {
		setInitialsData(data);
	};

	// Calculate if save button should be disabled for each tab
	const _isChooseDisabled =
		!selectedSignatureId ||
		!firstName.trim() ||
		!lastName.trim() ||
		!initials.trim();
	const isDrawDisabled = !signatureData || !initialsData;
	const isUploadDisabled = !signatureData || !initialsData;

	// Handle create signature
	const handleCreateSignature = () => {
		// TODO: Save signature data to your backend/state management
		console.log("Signature Data:", signatureData);
		console.log("Initials Data:", initialsData);
		console.log("First Name:", firstName);
		console.log("Last Name:", lastName);
		console.log("Initials:", initials);

		// For now, just log the data - you can implement saving logic here
		if (onboarding && onboardingForm) {
			setOnboardingForm({
				...onboardingForm,
				firstName,
				lastName,
				hasOnboarded: true,
			});
			navigate({ to: "/onboarding" });
		}
	};

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		setSignatureData(null);
		setInitialsData(null);
		setSelectedSignatureId(null);
	};

	return (
		<div className="min-h-screen">
			{/* Header */}
			<header className="flex sticky top-0 z-50 justify-between items-center px-8 h-16 border-b glass bg-background/50 border-border">
				<div className="flex gap-4 items-center">
					<Logo
						className="px-0"
						textClassName="text-foreground font-bold"
						iconOnly
					/>
					<motion.h3
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{
							type: "spring",
							stiffness: 200,
							damping: 25,
							delay: 0.1,
						}}
					>
						Create Your Signature
					</motion.h3>
				</div>
			</header>

			{/* Main Content */}
			<main className="p-8 mx-auto max-w-6xl space-y-8 flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)]">
				<Button
					variant="ghost"
					size="lg"
					className="self-start mb-4"
					render={<Link to={onboarding ? "/onboarding" : "/dashboard"} />}
				>
					<CaretLeftIcon className="size-5" weight="bold" />
					<p>Back</p>
				</Button>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						delay: 0.2,
					}}
				>
					<Image
						src="/sign-bg.webp"
						alt="Signature Background"
						className="w-full h-full rounded-xl"
					/>
				</motion.div>
				{/* Name and Initials Input */}
				{/* <motion.div
          className="grid grid-cols-3 gap-4 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 25,
            delay: 0.3,
          }}
        >
          <div className="space-y-2">
            <label htmlFor="firstName" className="text-sm font-medium">
              First Name *
            </label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="lastName" className="text-sm font-medium">
              Last Name *
            </label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="initials" className="text-sm font-medium">
              Initials *
            </label>
            <Input
              id="initials"
              value={initials}
              onChange={(e) => setInitials(e.target.value)}
              placeholder="Enter your initials"
            />
          </div>
        </motion.div> */}

				{/* Signature Creation */}
				<motion.div
					className="w-full"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						type: "spring",
						stiffness: 200,
						damping: 25,
						delay: 0.4,
					}}
				>
					<Tabs
						defaultValue="draw"
						onValueChange={handleTabChange}
						className="w-full min-h-[32rem]"
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="draw">
								<PaintBrushIcon className="size-5" weight="bold" />
								<p>Draw</p>
							</TabsTrigger>
							<TabsTrigger value="upload">
								<UploadIcon className="size-5" weight="bold" />
								<p>Upload</p>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="draw" className="mt-6">
							<SignatureDraw
								signatureData={signatureData}
								initialsData={initialsData}
								onSignatureDialogOpen={() => setIsSignatureDialogOpen(true)}
								onInitialsDialogOpen={() => setIsInitialsDialogOpen(true)}
								onSignatureClear={handleClearSignature}
								onInitialsClear={handleClearInitials}
								onCreateSignature={handleCreateSignature}
								disabled={isDrawDisabled}
							/>
						</TabsContent>

						<TabsContent value="upload" className="mt-6">
							<SignatureUpload
								signatureData={signatureData}
								initialsData={initialsData}
								onSignatureUpload={handleSignatureUpload}
								onInitialsUpload={handleInitialsUpload}
								onSignatureClear={handleClearSignature}
								onInitialsClear={handleClearInitials}
								onCreateSignature={handleCreateSignature}
								disabled={isUploadDisabled}
							/>
						</TabsContent>
					</Tabs>
				</motion.div>
				{onboarding ? <OnboardingSwitchAccountLink className="pb-8" /> : null}
			</main>

			{/* Signature Dialog */}
			<SignatureDialog
				isOpen={isSignatureDialogOpen}
				onClose={() => setIsSignatureDialogOpen(false)}
				onSave={handleSignatureSave}
				title="Draw Your Signature"
			/>

			{/* Initials Dialog */}
			<SignatureDialog
				isOpen={isInitialsDialogOpen}
				onClose={() => setIsInitialsDialogOpen(false)}
				onSave={handleInitialsSave}
				title="Draw Your Initials"
			/>
		</div>
	);
}

import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/dashboard/signature/create/")({
	component: CreateNewSignaturePage,
});
