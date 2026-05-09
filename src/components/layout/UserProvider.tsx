"use client";

import { createContext, useContext } from "react";

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  isManager: boolean;
};

const UserContext = createContext<CurrentUser | null>(null);

export function UserProvider({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useCurrentUser must be used inside UserProvider");
  return ctx;
}
