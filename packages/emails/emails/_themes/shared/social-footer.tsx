import { Column, Img, Link, Row, Section, Text } from "@react-email/components";
import {
	FILOSIGN_FOOTER_LINKS,
	FILOSIGN_FOOTER_TAGLINE,
} from "../../../src/constants";
import { filosignEmailAssets } from "../../../src/email-assets";

type SocialFooterProps = {
	/** Use white icons on dark backgrounds */
	lightIcons?: boolean;
	className?: string;
	taglineClassName?: string;
};

export function SocialFooter({
	lightIcons = false,
	className = "bg-bg",
	taglineClassName = "font-13 text-fg-3 mx-auto mt-0 mb-8 max-w-[320px] text-center font-sans",
}: SocialFooterProps) {
	const xIcon = filosignEmailAssets.shared.socialX(!lightIcons);

	return (
		<Section className={className}>
			<Row>
				<Column className="px-6 py-10 text-center">
					<Text className={taglineClassName}>{FILOSIGN_FOOTER_TAGLINE}</Text>
					<Section className="mb-8">
						<Row align="center">
							<Column align="center" className="w-1/3">
								<Link
									href={FILOSIGN_FOOTER_LINKS.email.href}
									className="inline-block no-underline"
								>
									<Img
										src={filosignEmailAssets.icons.email}
										alt=""
										width={18}
										height={18}
										className="mx-auto block"
									/>
								</Link>
							</Column>
							<Column align="center" className="w-1/3">
								<Link
									href={FILOSIGN_FOOTER_LINKS.x.href}
									className="inline-block no-underline"
								>
									<Img
										src={xIcon}
										alt=""
										width={18}
										height={18}
										className="mx-auto block"
									/>
								</Link>
							</Column>
							<Column align="center" className="w-1/3">
								<Link
									href={FILOSIGN_FOOTER_LINKS.website.href}
									className="inline-block no-underline"
								>
									<Img
										src={filosignEmailAssets.icons.website}
										alt=""
										width={18}
										height={18}
										className="mx-auto block"
									/>
								</Link>
							</Column>
						</Row>
					</Section>
					<Text className="font-11 text-fg-3 mx-auto mt-0 mb-0 max-w-[400px] text-center italic font-sans">
						This message was sent by Filosign because someone used your email
						address in the product. If you did not expect it, you can ignore
						this email.
					</Text>
				</Column>
			</Row>
		</Section>
	);
}
