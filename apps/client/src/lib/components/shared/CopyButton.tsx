import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../../utils/utils";
import { Button } from "../ui/button";

export function CopyButton({
	text,
	className,
}: {
	text: string;
	className?: string;
}) {
	const [isCopied, setIsCopied] = useState(false);
	return (
		<Button
			variant="link"
			size="icon"
			className={cn("size-fit p-1", className)}
			onClick={() => {
				navigator.clipboard.writeText(text);
				setIsCopied(true);
				setTimeout(() => {
					setIsCopied(false);
				}, 2000);
			}}
		>
			{isCopied ? (
				<CheckIcon className="size-4" />
			) : (
				<CopyIcon className="size-4" />
			)}
		</Button>
	);
}
