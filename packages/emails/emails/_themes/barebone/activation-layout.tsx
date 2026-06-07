/** Adapted from react-email demo 01-Barebone/activation (MIT). */
import { Button, Heading, Img, Section, Text } from "@react-email/components";
import { filosignEmailAssets } from "../../../src/email-assets";
import type { EmailLayoutProps } from "../types";
import { BareboneShell } from "./shell";

export function ActivationLayout({
	title,
	preheader,
	ctaHref,
	ctaLabel,
	children,
	footnote,
	disclaimer,
	contactChannel,
}: EmailLayoutProps) {
	return (
		<BareboneShell preheader={preheader} contactChannel={contactChannel}>
			<Section className="bg-bg-2 mobile:px-6 mobile:py-12 rounded-[8px] px-[40px] py-[64px] text-center">
				{title ? (
					<Section className="mb-3">
						<Img
							src={filosignEmailAssets.logo}
							alt="Filosign"
							width={48}
							height={48}
							className="mx-auto mb-5 block"
						/>
						<Heading as="h1" className="font-28 text-fg m-0 font-sans">
							{title}
						</Heading>
					</Section>
				) : null}

				{children}

				<Section className="mb-6 text-center">
					<Button
						href={ctaHref}
						className="bg-fg font-16 text-fg-inverted inline-block rounded-lg px-7 py-4 text-center font-sans leading-6"
					>
						{ctaLabel}
					</Button>
				</Section>

				{footnote ? (
					<Text className="font-13 text-fg-3 mx-auto mt-0 mb-6 max-w-[400px] text-center font-sans">
						{footnote}
					</Text>
				) : null}

				{disclaimer ? (
					<Text className="font-13 text-fg-3 mx-auto mt-8 mb-0 max-w-[400px] text-center font-sans">
						{disclaimer}
					</Text>
				) : null}
			</Section>
		</BareboneShell>
	);
}
