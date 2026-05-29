import { CheckCircleIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { cn } from "../../../lib/cn";
import MockAvatar from "../kit/MockAvatar";
import MockRow from "../kit/MockRow";

type SignerContactRowProps = {
	initial: string;
	title: string;
	subtitle: string;
	allowed?: boolean;
	trailing?: ReactNode;
	className?: string;
};

export default function SignerContactRow({
	initial,
	title,
	subtitle,
	allowed = false,
	trailing,
	className,
}: SignerContactRowProps) {
	return (
		<MockRow
			className={cn(
				"relative gap-4 overflow-hidden p-3",
				!allowed && "opacity-60 hover:bg-muted/20",
				className,
			)}
			radius="xl"
		>
			<MockAvatar
				initial={initial}
				variant={allowed ? "primary" : "muted"}
				className="z-10"
			/>
			<div className="z-10 min-w-0 flex-1">
				<div
					className={cn(
						"font-manrope text-sm",
						allowed ? "font-semibold text-foreground" : "font-medium",
					)}
				>
					{title}
				</div>
				<div className="font-manrope text-xs text-muted-foreground">
					{subtitle}
				</div>
			</div>
			{allowed ? (
				<div className="absolute -right-3 -bottom-3 z-0 flex size-12 items-center justify-center rounded-full bg-primary">
					<CheckCircleIcon
						className="-mt-1 -ml-1 size-6 text-white"
						weight="bold"
						aria-hidden
					/>
				</div>
			) : (
				trailing
			)}
		</MockRow>
	);
}
