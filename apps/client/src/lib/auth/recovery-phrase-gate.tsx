import { CaretRightIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import Logo from "@/src/lib/components/app/chrome/logo";
import { Button } from "@/src/lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/src/lib/components/ui/card";
import { Label } from "@/src/lib/components/ui/label";
import { Textarea } from "@/src/lib/components/ui/textarea";

type RecoveryPhraseGateProps = {
	recoveryPhrase: string;
	onRecoveryPhraseChange: (value: string) => void;
	error: string;
	onRecover: () => void;
	onCancel: () => void;
	isRecoverPending: boolean;
	isLoginPending: boolean;
	phraseInputId?: string;
};

export function RecoveryPhraseGate({
	recoveryPhrase,
	onRecoveryPhraseChange,
	error,
	onRecover,
	onCancel,
	isRecoverPending,
	isLoginPending,
	phraseInputId = "recovery-phrase",
}: RecoveryPhraseGateProps) {
	return (
		<div className="flex justify-center items-center min-h-screen bg-background">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.3, delay: 0.2 }}
				className="flex flex-col justify-center items-center px-8 mx-auto"
			>
				<Logo className="mb-4" textClassName="text-foreground font-semibold" />
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.2 }}
					className="flex flex-col justify-center items-center mx-auto w-full"
				>
					<Card className="w-full">
						<CardHeader>
							<CardTitle>Recover with phrase</CardTitle>
							<CardDescription>
								Your wallet could not unlock this session automatically. Enter
								your 24-word Filosign recovery phrase.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2 w-full min-w-sm max-w-sm">
								<Label htmlFor={phraseInputId}>Recovery phrase</Label>
								<Textarea
									id={phraseInputId}
									value={recoveryPhrase}
									onChange={(event) =>
										onRecoveryPhraseChange(event.target.value)
									}
									placeholder="24-word recovery phrase"
									rows={6}
								/>
							</div>

							{error ? (
								<p className="text-destructive text-sm text-center">{error}</p>
							) : null}

							<div className="flex gap-3">
								<Button
									variant="ghost"
									onClick={onCancel}
									className="flex-1"
									disabled={isLoginPending || isRecoverPending}
								>
									Cancel
								</Button>

								<Button
									onClick={() => void onRecover()}
									disabled={!recoveryPhrase.trim() || isRecoverPending}
									className="flex-1 group"
									variant="primary"
								>
									{isRecoverPending ? "Recovering…" : "Unlock session"}
									{!isRecoverPending && (
										<CaretRightIcon
											className="transition-transform duration-200 size-4 group-hover:translate-x-1"
											weight="bold"
										/>
									)}
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</motion.div>
		</div>
	);
}
