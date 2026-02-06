import { type ReactNode } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { privyConfig } from "../config/privyConfig";

function ContextProvider({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider appId={privyConfig.appId} config={privyConfig.config as PrivyClientConfig}>
      {children}
    </PrivyProvider>
  );
}

export default ContextProvider;
