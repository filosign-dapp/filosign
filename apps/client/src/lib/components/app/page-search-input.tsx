import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/src/lib/components/ui/input-group";
import { cn } from "@/src/lib/utils/index";

type PageSearchInputProps = {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	"aria-label": string;
	maxLength?: number;
	className?: string;
};

export function PageSearchInput({
	value,
	onChange,
	placeholder,
	"aria-label": ariaLabel,
	maxLength = 100,
	className,
}: PageSearchInputProps) {
	return (
		<InputGroup className={cn("w-full sm:w-52 md:w-60", className)}>
			<InputGroupAddon align="inline-start">
				<MagnifyingGlassIcon aria-hidden />
			</InputGroupAddon>
			<InputGroupInput
				type="search"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				maxLength={maxLength}
				aria-label={ariaLabel}
			/>
		</InputGroup>
	);
}
