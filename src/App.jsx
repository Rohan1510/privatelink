import React, { useMemo } from "react";
import SecureChat from "./SecureChat";
import { getLocalUser } from "./localUser";
import { useTheme } from "./useTheme";

export default function App() {
  useTheme();

  // Device-local identity: no accounts, no sign-in, no remote auth provider.
  const user = useMemo(() => getLocalUser(), []);

  return (
    <div key="chat-screen" className="fade-in w-full min-h-screen">
      <SecureChat user={user} />
    </div>
  );
}
