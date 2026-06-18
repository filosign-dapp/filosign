import { useFilosignContext } from "@filosign/react";
import { useUserProfile } from "@filosign/react/users";
import { activeLegalAssent } from "@filosign/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import env from "@/src/env";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/src/lib/components/ui/alert-dialog";
import { Button } from "@/src/lib/components/ui/button";
import { showAppErrorToast } from "@/src/lib/errors";
import { SignInTermsFooter } from "@/src/routes/-components/sign-in/terms-footer";

interface Props {
	children: ReactNode;
}

export function TermsReacceptanceGate({ children }: Props) {
	const { rpcQuery } = useFilosignContext();
	const queryClient = useQueryClient();
	const { data: userProfile, isLoading } = useUserProfile();
	const [termsChecked, setTermsChecked] = useState(false);

	const acceptTermsMutation = useMutation({
		mutationFn: async () => {
			await rpcQuery.users.acceptTerms.call(activeLegalAssent());
			await queryClient.invalidateQueries({
				queryKey: rpcQuery.users.profile.me.key(),
			});
		},
		onError: (err) => {
			showAppErrorToast(err);
		},
	});

	if (isLoading) {
		return <>{children}</>;
	}

	const needsTermsAcceptance = userProfile?.needsTermsAcceptance === true;
	const astroBase = env.VITE_ASTRO_URL.replace(/\/$/, "");

	return (
		<>
			{children}

			<AlertDialog open={needsTermsAcceptance}>
				<AlertDialogContent
					size="default"
					className="max-w-md [&>button]:hidden"
				>
					<AlertDialogHeader>
						<AlertDialogTitle>Accept terms to continue</AlertDialogTitle>
						<AlertDialogDescription className="text-left">
							We have updated our Terms of Service and Privacy Policy. Please
							review the{" "}
							<a
								href={`${astroBase}/terms`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary underline hover:text-primary/80 font-medium"
							>
								Terms of Service
							</a>{" "}
							and{" "}
							<a
								href={`${astroBase}/privacy`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary underline hover:text-primary/80 font-medium"
							>
								Privacy Policy
							</a>{" "}
							before continuing to use your account.
						</AlertDialogDescription>
					</AlertDialogHeader>

					<SignInTermsFooter
						checked={termsChecked}
						onCheckedChange={setTermsChecked}
					/>

					<AlertDialogFooter>
						<Button
							type="button"
							variant="primary"
							className="w-full"
							disabled={!termsChecked || acceptTermsMutation.isPending}
							isLoading={acceptTermsMutation.isPending}
							onClick={() => acceptTermsMutation.mutate()}
						>
							Accept and Continue
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
