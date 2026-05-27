import {
	CaretLeftIcon,
	PaintBrushIcon,
	TextAaIcon,
	UploadIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
	FullBleedMain,
	FullBleedPageHeader,
} from "@/src/lib/components/app/chrome/full-bleed-page-header";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Image } from "@/src/lib/components/app/media/image";
import { Button } from "@/src/lib/components/ui/button";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/src/lib/components/ui/tabs";
import { OnboardingSwitchAccountLink } from "@/src/routes/onboarding/-components/OnboardingSwitchAccountLink";
import {
	SignatureCreateProvider,
	useSignatureCreate,
} from "../-lib/context/context";
import { useSignatureCreateController } from "../-lib/hooks/use-signature-create-controller";
import { SignatureChoose } from "./signature-choose";
import { SignatureDialogs } from "./signature-dialogs";
import { SignatureDraw } from "./signature-draw";
import { SignatureUpload } from "./signature-upload";

export function SignatureCreatePage() {
	const { onboarding, handleTabChange } = useSignatureCreate();

	return (
		<div className="min-h-screen">
			<FullBleedPageHeader>
				<div className="flex gap-4 items-center">
					<Logo className="px-0" textClassName="text-foreground" iconOnly />
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
			</FullBleedPageHeader>

			<FullBleedMain className="max-w-6xl space-y-8 flex flex-col items-center justify-center">
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
						defaultValue="choose"
						onValueChange={handleTabChange}
						className="w-full min-h-[32rem]"
					>
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="choose">
								<TextAaIcon className="size-5" weight="bold" />
								<p>Choose</p>
							</TabsTrigger>
							<TabsTrigger value="draw">
								<PaintBrushIcon className="size-5" weight="bold" />
								<p>Draw</p>
							</TabsTrigger>
							<TabsTrigger value="upload">
								<UploadIcon className="size-5" weight="bold" />
								<p>Upload</p>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="choose" className="mt-6">
							<SignatureChoose />
						</TabsContent>

						<TabsContent value="draw" className="mt-6">
							<SignatureDraw />
						</TabsContent>

						<TabsContent value="upload" className="mt-6">
							<SignatureUpload />
						</TabsContent>
					</Tabs>
				</motion.div>
				{onboarding ? <OnboardingSwitchAccountLink className="pb-8" /> : null}
			</FullBleedMain>

			<SignatureDialogs />
		</div>
	);
}

/** Onboarding embeds this route tree without `index.tsx` wiring. */
export function CreateNewSignaturePage({
	onboarding,
}: {
	onboarding?: boolean;
}) {
	const controller = useSignatureCreateController({ onboarding });
	return (
		<SignatureCreateProvider value={controller}>
			<SignatureCreatePage />
		</SignatureCreateProvider>
	);
}
