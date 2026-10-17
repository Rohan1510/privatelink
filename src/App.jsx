import React, { useEffect, useState } from "react";
import SecureChat from "./SecureChat";
import AuthScreen from "./AuthScreen";
import { getLoggedInUser, handleSignOut } from "./auth";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkAuth = async () => {
    try {
      const currentUser = await getLoggedInUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const onSignOut = async () => {
    try {
      await handleSignOut();
      setUser(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  if (checkingAuth) {
    return (
      <div className="noise connect-wrapper flex items-center justify-center min-h-screen">
        <div className="bg-grid-overlay" />
        <div className="text-center z-10">
          <span className="shimmer-text" style={{ fontSize: "13px", letterSpacing: "3px" }}>
            INITIALIZING STARK SECURE IDENTITY…
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={checkAuth} />;
  }

  return <SecureChat user={user} onSignOut={onSignOut} />;
}
