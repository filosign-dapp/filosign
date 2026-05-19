import type { ReactNode } from "react";
import { ThirdwebProvider } from "thirdweb/react";

export function ThirdwebRootProvider({ children }: { children: ReactNode }) {
	return <ThirdwebProvider>{children}</ThirdwebProvider>;
}
