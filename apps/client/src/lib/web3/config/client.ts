import { createThirdwebClient } from "thirdweb";
import env from "@/src/env";

export const thirdwebClient = createThirdwebClient({
	clientId: env.VITE_THIRDWEB_CLIENT_ID,
});
