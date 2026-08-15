import { createContext, useContext, ReactNode } from "react";
import { authClient } from "@bmhk-2026/client/auth-client";

type UserSessionContextType = ReturnType<typeof authClient.useSession>;

const UserSessionContext = createContext<UserSessionContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();
  
  return (
    <UserSessionContext.Provider value={session}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession() {
  const context = useContext(UserSessionContext);
  if (!context) {
    throw new Error("useUserSession must be used within a UserProvider");
  }
  return context;
}
