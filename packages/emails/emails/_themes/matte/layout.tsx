/** Adapted from react-email demo 02-Matte/activation (MIT). */
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
import { MatteFonts } from "./fonts";
import { matteTailwindConfig } from "./theme";

export function MatteLayout({
	title,
	preheader,
	ctaHref,
	ctaLabel,
	children,
	footnote,
	disclaimer,
	heroImage = filosignEmailAssets.collage.hero1,
}: EmailLayoutProps) {
	return (
		<Tailwind config={matteTailwindConfig}>
			<Html lang="en">
				<Head>
					<meta name="color-scheme" content="light" />
					<MatteFonts />
				</Head>
				<Body className="bg-canvas font-14 font-inter text-fg m-0 p-0">
					<Preview>{preheader}</Preview>
					<Container className="mx-auto max-w-[640px] px-4 pt-16 pb-6">
						<Section className="shadow-collage-card rounded-[8px]">
							<Section className="bg-bg border-stroke rounded-[8px] border">
								<Section className="mobile:px-6 px-10 pt-16">
									<Img
										src={heroImage}
										alt=""
										width={148}
										height={111}
										className="block border-none"
									/>
								</Section>

								<Section className="mobile:px-6 px-10 pt-8">
									{title ? (
										<Section className="mb-9">
											<Text className="font-48 text-fg m-0 font-sans">
												{title}
											</Text>
										</Section>
									) : null}

									{children}

									<Section className="mt-8 mb-6">
										<Button
											href={ctaHref}
											className="bg-brand font-15 font-inter text-fg-inverted inline-block border-none px-5 py-3.5 text-center"
										>
											{ctaLabel}
										</Button>
									</Section>

									{footnote ? (
										<Text className="font-11 font-inter text-fg-3 m-0 max-w-[310px]">
											{footnote}
										</Text>
									) : null}

									{disclaimer ? (
										<Text className="font-11 font-inter text-fg-3 m-0 mt-4 max-w-[310px]">
											{disclaimer}
										</Text>
									) : null}
								</Section>

								<Section className="border-stroke border-t px-10 py-12">
									<SocialFooter
										className="bg-bg"
										taglineClassName="font-13 font-inter text-fg-3 m-0 max-w-[320px] text-left"
									/>
								</Section>
							</Section>
						</Section>
					</Container>
				</Body>
			</Html>
		</Tailwind>
	);
}
