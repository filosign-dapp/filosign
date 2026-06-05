import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { cn } from "@/src/lib/utils";

type DocsLinkProps = {
	href: string;
	children: React.ReactNode;
	className?: string;
	showIcon?: boolean;
};

export function DocsLink({
	href,
	children,
	className,
	showIcon = true,
}: DocsLinkProps) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline font-manrope",
				className,
			)}
		>
			{children}
			{showIcon ? (
				<ArrowSquareOutIcon className="size-3.5 shrink-0" aria-hidden />
			) : null}
		</a>
	);
}
