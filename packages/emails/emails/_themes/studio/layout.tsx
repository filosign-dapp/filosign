/** Adapted from react-email demo 05-Studio/welcome (MIT). */
import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Img,
	Preview,
	Section,
	Tailwind,
	Text,
} from "@react-email/components";
import { filosignEmailAssets } from "../../../src/email-assets";
import { SocialFooter } from "../shared/social-footer";
import type { EmailLayoutProps } from "../types";
import { StudioFonts } from "./fonts";
import { studioTailwindConfig } from "./theme";

export function StudioLayout({
	title,
	preheader,
	ctaHref,
	ctaLabel,
	children,
	footnote,
	disclaimer,
	heroImage = filosignEmailAssets.tech.hero1,
}: EmailLayoutProps) {
	return (
		<Tailwind config={studioTailwindConfig}>
			<Html lang="en">
				<Head>
					<meta name="color-scheme" content="light" />
					<StudioFonts />
				</Head>
				<Body className="bg-canvas font-14 m-0 p-0 font-sans text-fg">
					<Preview>{preheader}</Preview>
					<Container className="mx-auto max-w-[640px] px-4 py-12">
						<Section className="bg-bg-dark rounded-[8px] px-6 py-4">
							<Text className="font-11 text-fg-inverted m-0 text-center font-mono uppercase tracking-wider">
								Filosign
							</Text>
						</Section>

						<Section className="bg-bg border-stroke mt-4 rounded-[8px] border">
							<Section className="mobile:px-6 px-10 pt-12">
								<Img
									src={filosignEmailAssets.logo}
									alt="Filosign"
									width={40}
									height={40}
									className="block"
								/>
								{title ? (
									<Text className="font-48 text-fg m-0 mt-8 font-sans">
										{title}
									</Text>
								) : null}
							</Section>

							<Section className="mobile:px-6 px-10 pt-6">
								<Img
									src={heroImage}
									alt=""
									width={560}
									className="block w-full max-w-[560px] rounded-[4px]"
								/>
							</Section>

							<Section className="mobile:px-6 px-10 py-8">
								{children}

								<Section className="mt-8">
									<Button
										href={ctaHref}
										className="bg-brand font-15 text-fg-inverted inline-block px-5 py-3.5 text-center font-sans"
									>
										{ctaLabel}
									</Button>
								</Section>

								{footnote ? (
									<Text className="font-11 text-fg-3 m-0 mt-6 max-w-[400px]">
										{footnote}
									</Text>
								) : null}

								{disclaimer ? (
									<Text className="font-11 text-fg-3 m-0 mt-4 max-w-[400px]">
										{disclaimer}
									</Text>
								) : null}
							</Section>

							<Section className="border-stroke border-t px-10 py-12">
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
