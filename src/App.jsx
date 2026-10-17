import React, { useEffect, useState } from "react";
import SecureChat from "./SecureChat";
import AuthScreen from "./AuthScreen";
import { getLoggedInUser, handleSignOut } from "./auth";
import { useTheme } from "./useTheme";

export default function App() {
  useTheme();
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

  const isConfigured = Boolean(
    (import.meta.env.VITE_COGNITO_USER_POOL_ID || "us-east-1_QWtghRdQu") &&
    (import.meta.env.VITE_COGNITO_CLIENT_ID || "50aulhes4c73gl79v7qs6df4vq")
  );

  if (!isConfigured) {
    return (
      <div className="connect-wrapper flex items-center justify-center min-h-screen px-4">
        <div className="bg-grid-overlay" />
        <div className="panel connect-panel max-w-lg w-full text-center z-10" style={{ maxWidth: "520px" }}>
          <h1 className="brand-title" style={{ fontSize: "18px", marginBottom: "8px" }}>DEPLOYMENT SETUP REQUIRED</h1>
          <p className="brand-subtitle" style={{ marginBottom: "20px" }}>Missing Vercel Environment Variables</p>
          <div className="error-alert" style={{ marginBottom: "16px", textAlign: "left", fontSize: "12px", lineHeight: "1.6" }}>
            Vite compiles environment variables at build time. To enable AWS Cognito authentication on Vercel, navigate to <strong>Vercel Dashboard → Project Settings → Environment Variables</strong> and add:
          </div>
          <div className="id-display-box" style={{ textAlign: "left", fontSize: "11px", marginBottom: "16px", lineHeight: "1.8" }}>
            <div><strong>VITE_COGNITO_USER_POOL_ID</strong> = us-east-1_QWtghRdQu</div>
            <div><strong>VITE_COGNITO_CLIENT_ID</strong> = 50aulhes4c73gl79v7qs6df4vq</div>
            <div><strong>VITE_COGNITO_REGION</strong> = us-east-1</div>
          </div>
          <p className="security-note-text" style={{ fontSize: "11px", color: "var(--ink-muted)", textAlign: "left" }}>
            💡 After adding the variables in Vercel, go to <strong>Deployments → Click "..." on latest deployment → Redeploy</strong> (uncheck "Use existing build cache") to trigger a clean rebuild.
          </p>
        </div>
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div className="connect-wrapper flex items-center justify-center min-h-screen">
        <div className="bg-grid-overlay" />
        <div className="text-center z-10">
          <span className="shimmer-text" style={{ fontSize: "12px", letterSpacing: "1.5px" }}>
            INITIALIZING QUADRIFOGLIO SECURE IDENTITY…
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div key="auth-screen" className="fade-in w-full min-h-screen">
        <AuthScreen onAuthenticated={checkAuth} />
      </div>
    );
  }

  return (
    <div key="chat-screen" className="fade-in w-full min-h-screen">
      <SecureChat user={user} onSignOut={onSignOut} />
    </div>
  );
}
