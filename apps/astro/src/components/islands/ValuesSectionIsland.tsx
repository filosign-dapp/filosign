import {
	InfinityIcon,
	LockKeyIcon,
	ShieldCheckIcon,
	UsersThreeIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { MarketingInViewStagger } from "./MarketingStagger";
import { MotionProvider } from "./MotionProvider";

const badgeClass =
	"inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-sm font-medium bg-secondary/50 text-secondary-foreground";

type ValueItem =
	| {
			type: "text";
			title: string;
			description: string;
			icon: ReactNode;
	  }
	| {
			type: "image";
			src: string;
			alt: string;
	  };

const values: ValueItem[] = [
	{
		type: "text",
		title: "Trustless Security",
		description:
			"Building on decentralized networks to ensure your documents are verifiable and tamper-proof, removing the need for blind trust.",
		icon: <ShieldCheckIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/images/stock_2.webp",
		alt: "Team member working",
	},
	{
		type: "text",
		title: "User Sovereignty",
		description:
			"You own your data. Our non-custodial architecture means we never hold your private keys or document contents.",
		icon: <LockKeyIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/images/stock_1.webp",
		alt: "Team collaboration",
	},
	{
		type: "image",
		src: "/images/stock_4.webp",
		alt: "Office environment",
	},
	{
		type: "text",
		title: "Seamless Experience",
		description:
			"Complex cryptography under the hood, simple interface on the surface. We make Web3 signing accessible to everyone.",
		icon: <UsersThreeIcon className="size-6" />,
	},
	{
		type: "image",
		src: "/images/stock_6.webp",
		alt: "Discussion",
	},
	{
		type: "text",
		title: "Built for Forever",
		description:
			"Storage on Filecoin ensures your documents are preserved permanently and reliably, independent of any single entity.",
		icon: <InfinityIcon className="size-6" />,
	},
];

export default function ValuesSectionIsland() {
	return (
		<MotionProvider>
			<section className="py-24 px-4 md:px-8 lg:px-page bg-background">
				<div className="max-w-7xl mx-auto">
					<MarketingInViewStagger
						pace="page"
						className="flex flex-col items-center text-center mb-16 space-y-4"
					>
						<div className={badgeClass}>
							<UsersThreeIcon className="mr-1 size-3" />
							Our values
						</div>

						<h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight max-w-3xl mx-auto font-manrope">
							We're founders who think privacy should be a fundamental right!
						</h2>
					</MarketingInViewStagger>

					<MarketingInViewStagger
						pace="page"
						maxVisible={12}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
					>
						{values.map((item) => (
							<div
								key={item.type === "text" ? item.title : item.src}
								className={`relative overflow-hidden rounded-3xl h-[360px] md:h-[420px] group ${
									item.type === "text"
										? "bg-muted/30 p-8 flex flex-col justify-between"
										: ""
								}`}
							>
								{item.type === "text" ? (
									<>
										<div className="space-y-4">
											<div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shadow-sm text-foreground">
												{item.icon}
											</div>
											<h3 className="text-xl font-semibold font-manrope">
												{item.title}
											</h3>
										</div>
										<p className="text-muted-foreground leading-relaxed">
											{item.description}
										</p>
									</>
								) : (
									<img
										src={item.src}
										alt={item.alt}
										width={400}
										height={500}
										className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
									/>
								)}
							</div>
						))}
					</MarketingInViewStagger>
				</div>
			</section>
		</MotionProvider>
	);
}
