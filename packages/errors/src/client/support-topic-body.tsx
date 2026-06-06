import { renderSupportStepHtml } from "./support-step-html";

function SupportBlock({ text }: { text: string }) {
	const lines = text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const bulletLines = lines.filter((line) => line.startsWith("- "));

	if (bulletLines.length >= 2 && bulletLines.length === lines.length) {
		return (
			<ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">
				{bulletLines.map((line) => (
					<li
						key={line}
						className="text-pretty [&_strong]:font-medium [&_strong]:text-foreground"
						dangerouslySetInnerHTML={{
							__html: renderSupportStepHtml(line.slice(2)),
						}}
					/>
				))}
			</ul>
		);
	}

	return (
		<p
			className="text-pretty [&_strong]:font-medium [&_strong]:text-foreground"
			dangerouslySetInnerHTML={{
				__html: renderSupportStepHtml(text.replace(/\n+/g, " ").trim()),
			}}
		/>
	);
}

export function SupportTopicBody({
	description,
	steps,
}: {
	description: string;
	steps: readonly string[];
}) {
	return (
		<div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
			<p className="text-pretty text-muted-foreground">{description}</p>
			{steps.map((step) => (
				<SupportBlock key={step} text={step} />
			))}
		</div>
	);
}
