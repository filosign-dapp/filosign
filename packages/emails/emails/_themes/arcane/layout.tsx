/** Adapted from react-email demo 04-Arcane/order-confirmation (MIT). */
import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { filosignEmailAssets } from "../../../src/email-assets";
import { SocialFooter } from "../shared/social-footer";
import type { EmailLayoutProps } from "../types";
import { ArcaneFonts } from "./fonts";
import { arcaneTailwindConfig } from "./theme";

export function ArcaneLayout({
	title,
	preheader,
	ctaHref,
	ctaLabel,
	children,
	footnote,
	disclaimer,
	heroImage = filosignEmailAssets.skin.hero1,
}: EmailLayoutProps) {
	return (
		<Tailwind config={arcaneTailwindConfig}>
			<Html lang="en">
				<Head>
					<meta name="color-scheme" content="light" />
					<ArcaneFonts />
				</Head>
				<Body className="bg-canvas font-14 m-0 p-0 font-sans text-fg">
					<Preview>{preheader}</Preview>
					<Container className="mx-auto max-w-[640px] px-4 py-16">
						<Section className="bg-bg border-stroke rounded-[8px] border">
							<Section className="mobile:px-6 px-10 pt-12">
								<Img
									src={filosignEmailAssets.logo}
									alt="Filosign"
									width={32}
									height={32}
									className="block"
								/>
							</Section>

							<Section className="mobile:px-6 mobile:pt-8 px-10 pt-12">
								{title ? (
									<Text className="font-72 mobile:text-[48px] font-serif text-fg m-0">
										{title}
									</Text>
								) : null}
							</Section>

							<Section className="mobile:px-6 px-10 pt-8">
								<Img
									src={heroImage}
									alt=""
									width={560}
									className="block w-full max-w-[560px]"
								/>
							</Section>

							<Section className="mobile:px-6 px-10 pt-8 pb-6">
								{children}

								<Section className="mt-8">
									<Link
										href={ctaHref}
										className="font-15 text-fg underline decoration-solid underline-offset-4"
									>
										{ctaLabel} →
									</Link>
								</Section>

								{footnote ? (
									<Text className="font-11 text-fg-3 m-0 mt-8 max-w-[400px]">
										{footnote}
									</Text>
								) : null}

								{disclaimer ? (
									<Text className="font-11 text-fg-3 m-0 mt-4 max-w-[400px]">
										{disclaimer}
									</Text>
								) : null}
							</Section>

							<Hr className="border-stroke m-0" />

							<Section className="mobile:px-6 px-10 py-12">
								<SocialFooter
									className="bg-bg"
									taglineClassName="font-13 text-fg-3 m-0 max-w-[320px] text-left"
								/>
							</Section>
						</Section>
					</Container>
				</Body>
			</Html>
		</Tailwind>
	);
}
