/** Adapted from react-email demo 01-Barebone/welcome (MIT). */
import { Button, Heading, Img, Section, Text } from "@react-email/components";
import { filosignEmailAssets } from "../../../src/email-assets";
import type { WelcomeLayoutProps } from "../types";
import { BareboneShell } from "./shell";

const heroWidth = 600;
const heroHeight = Math.round((heroWidth * 9) / 16);

export function WelcomeLayout({
	title,
	eyebrow,
	preheader,
	ctaHref,
	ctaLabel,
	children,
	secondarySections,
	footnote,
	disclaimer,
	heroImage = filosignEmailAssets.barebone.hero,
	contactChannel,
	showSocialFooter,
}: WelcomeLayoutProps) {
	return (
		<BareboneShell
			preheader={preheader}
			contactChannel={contactChannel}
			showSocialFooter={showSocialFooter}
		>
			<Section className="bg-bg-2 mobile:mb-2 mb-6 rounded-[10px] px-5 pt-5 pb-14 mobile:px-4 mobile:pt-4 mobile:pb-10">
				<Section className="mx-auto mb-10 max-w-[600px] overflow-hidden rounded-[12px]">
					<Img
						src={heroImage}
						alt=""
						width={heroWidth}
						height={heroHeight}
						className="block w-full object-cover"
						style={{
							objectFit: "cover",
							aspectRatio: "16 / 9",
							width: "100%",
							maxWidth: `${heroWidth}px`,
							height: "auto",
						}}
					/>
				</Section>
				<Section className="mx-auto max-w-[422px] text-center">
					{eyebrow ? (
						<Text className="font-13 text-fg-3 mt-0 mb-6 font-sans">
							{eyebrow}
						</Text>
					) : null}
					{title ? (
						<Heading as="h1" className="font-40 text-fg mt-0 mb-6 font-sans">
							{title}
						</Heading>
					) : null}
					{children}
					<Section className="mt-8 text-center">
						<Button
							href={ctaHref}
							className="bg-fg font-16 text-fg-inverted inline-block rounded-lg px-7 py-4 text-center font-sans leading-6"
						>
							{ctaLabel}
						</Button>
					</Section>
					{footnote ? (
						<Text className="font-13 text-fg-3 mx-auto mt-6 mb-0 max-w-[400px] text-center font-sans">
							{footnote}
						</Text>
					) : null}
					{disclaimer ? (
						<Text className="font-13 text-fg-3 mx-auto mt-8 mb-0 max-w-[400px] text-center font-sans">
							{disclaimer}
						</Text>
					) : null}
				</Section>
			</Section>

			{secondarySections ? (
				<Section className="bg-bg-2 mobile:mb-2 mb-6 rounded-[10px] px-5 pt-5 pb-14 mobile:px-4 mobile:pt-4 mobile:pb-10">
					{secondarySections}
				</Section>
			) : null}
		</BareboneShell>
	);
}
