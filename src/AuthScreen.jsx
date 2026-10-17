import React, { useState } from "react";
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import {
  handleSignIn,
  handleSignUp,
  handleConfirmSignUp,
  handleResendSignUpCode,
  handleResetPassword,
  handleConfirmResetPassword,
} from "./auth";

function AlfaEmblem({ size = 72 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
      <polygon
        points="36,4 68,36 36,68 4,36"
        fill="var(--canvas-deep)"
        stroke="var(--brand)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon
        points="36,14 58,36 36,58 14,36"
        fill="var(--canvas-dark)"
        stroke="var(--hairline)"
        strokeWidth="0.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <line x1="36" y1="20" x2="36" y2="52" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="36" x2="52" y2="36" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="36" cy="36" r="3" fill="var(--brand)" />
    </svg>
  );
}

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("signIn"); // "signIn" | "signUp" | "confirmSignUp" | "forgotPassword"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1 = request code, 2 = confirm new password

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const switchMode = (newMode) => {
    clearMessages();
    setMode(newMode);
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setForgotStep(1);
  };

  /* ===== 1. SIGN IN ===== */
  async function onSubmitSignIn(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      const { isSignedIn, nextStep } = await handleSignIn(email.trim(), password);
      if (isSignedIn) {
        onAuthenticated();
      } else if (nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        setMode("confirmSignUp");
        setMessage("Please confirm your account with the code sent to your email.");
      } else {
        setMessage(`Next step required: ${nextStep?.signInStep || "Verification"}`);
      }
    } catch (err) {
      if (err.name === "UserNotConfirmedException") {
        setMode("confirmSignUp");
        setMessage("Account not confirmed yet. Verification code has been sent.");
      } else if (err.name === "NotAuthorizedException") {
        setError("Incorrect username or password.");
      } else if (err.name === "UserNotFoundException") {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  /* ===== 2. SIGN UP ===== */
  async function onSubmitSignUp(e) {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      const { isSignUpComplete, nextStep } = await handleSignUp(email.trim(), password);
      if (isSignUpComplete) {
        setMessage("Registration successful! You can now sign in.");
        setMode("signIn");
      } else if (nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setMode("confirmSignUp");
        setMessage(`A 6-digit confirmation code was sent to ${email.trim()}.`);
      }
    } catch (err) {
      if (err.name === "UsernameExistsException") {
        setError("An account with this email already exists. Try signing in.");
      } else {
        setError(err.message || "Registration failed. Check password requirements.");
      }
    } finally {
      setLoading(false);
    }
  }

  /* ===== 3. CONFIRM SIGN UP CODE ===== */
  async function onSubmitConfirmCode(e) {
    e.preventDefault();
    if (!code || code.trim().length < 6) {
      setError("Please enter the 6-digit confirmation code.");
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      await handleConfirmSignUp(email.trim(), code.trim());
      // Try signing in immediately if password is in memory
      if (password) {
        try {
          const { isSignedIn } = await handleSignIn(email.trim(), password);
          if (isSignedIn) {
            onAuthenticated();
            return;
          }
        } catch {
          // fallback to sign in screen
        }
      }
      setMessage("Account confirmed successfully! Please sign in.");
      setMode("signIn");
      setPassword("");
    } catch (err) {
      if (err.name === "CodeMismatchException") {
        setError("Invalid verification code. Please check your inbox and try again.");
      } else if (err.name === "ExpiredCodeException") {
        setError("Verification code expired. Click Resend Code below.");
      } else {
        setError(err.message || "Failed to verify code.");
      }
    } finally {
      setLoading(false);
    }
  }

  /* ===== RESEND SIGN UP CODE ===== */
  async function onResendCode() {
    clearMessages();
    setLoading(true);
    try {
      await handleResendSignUpCode(email.trim());
      setMessage(`A fresh verification code was sent to ${email.trim()}.`);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  }

  /* ===== FORGOT PASSWORD ===== */
  async function onRequestReset(e) {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      await handleResetPassword(email.trim());
      setForgotStep(2);
      setMessage(`Password reset code sent to ${email.trim()}.`);
    } catch (err) {
      setError(err.message || "Failed to initiate password reset.");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirmReset(e) {
    e.preventDefault();
    if (!code || !newPassword) {
      setError("Please provide the reset code and a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    clearMessages();
    setLoading(true);
    try {
      await handleConfirmResetPassword(email.trim(), code.trim(), newPassword);
      setMessage("Password successfully reset! Please sign in with your new password.");
      setMode("signIn");
      setPassword("");
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container-wrapper">
      <div className="bg-grid-overlay" />

      <div className="auth-card-panel panel">
        {/* THEME SWITCHER */}
        <div className="flex justify-end w-full mb-3">
          <ThemeToggle showLabel />
        </div>

        {/* BRAND HEADER */}
        <div className="brand-header auth-brand-header">
          <AlfaEmblem size={72} />
          <h1 className="brand-title">QUADRIFOGLIO SECURE IDENTITY</h1>
          <p className="brand-subtitle">
            AWS Cognito Authentication · End-to-End Encrypted P2P
          </p>
        </div>

        {/* TAB TOGGLE (SIGN IN / CREATE ACCOUNT) */}
        {(mode === "signIn" || mode === "signUp") && (
          <div className="auth-tab-switch">
            <button
              type="button"
              className={`auth-tab-btn ${mode === "signIn" ? "auth-tab-active" : ""}`}
              onClick={() => switchMode("signIn")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${mode === "signUp" ? "auth-tab-active" : ""}`}
              onClick={() => switchMode("signUp")}
            >
              Create Account
            </button>
          </div>
        )}

        {/* STATUS & ERROR ALERTS */}
        {error && (
          <div className="error-alert auth-alert">
            <AlertTriangle size={15} className="text-danger flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {message && (
          <div className="success-alert auth-alert">
            <CheckCircle size={15} className="text-success flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === "signIn" && (
          <form key="signIn" onSubmit={onSubmitSignIn} className="auth-form tab-pane-enter">
            <div className="form-field-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={15} className="input-icon" />
                <input
                  type="email"
                  className="field auth-field"
                  placeholder="operator@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-field-group">
              <div className="form-label-row">
                <label className="form-label">Password</label>
                <button
                  type="button"
                  className="btn-link forgot-btn"
                  onClick={() => switchMode("forgotPassword")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon">
                <Lock size={15} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="field auth-field"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-accent auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="shimmer-text">Authenticating…</span>
              ) : (
                <>
                  <Lock size={15} />
                  <span>Sign In</span>
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. SIGN UP FORM */}
        {mode === "signUp" && (
          <form key="signUp" onSubmit={onSubmitSignUp} className="auth-form tab-pane-enter">
            <div className="form-field-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={15} className="input-icon" />
                <input
                  type="email"
                  className="field auth-field"
                  placeholder="operator@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-field-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={15} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="field auth-field"
                  placeholder="Min. 8 characters with number & symbol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="form-field-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-with-icon">
                <KeyRound size={15} className="input-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="field auth-field"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-accent auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="shimmer-text">Creating Account…</span>
              ) : (
                <>
                  <CheckCircle size={15} />
                  <span>Create Account</span>
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. CONFIRM SIGN UP CODE */}
        {mode === "confirmSignUp" && (
          <form key="confirmSignUp" onSubmit={onSubmitConfirmCode} className="auth-form tab-pane-enter">
            <div className="confirm-instructions">
              <Mail size={32} className="confirm-icon text-accent" />
              <h3 className="confirm-title">Verify Your Email</h3>
              <p className="confirm-subtitle">
                Enter the 6-digit confirmation code sent to <br />
                <strong className="text-accent">{email}</strong>
              </p>
            </div>

            <div className="form-field-group">
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                className="field auth-field code-input"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                maxLength={6}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn-accent auth-submit-btn"
              disabled={loading || code.length < 6}
            >
              {loading ? (
                <span className="shimmer-text">Verifying…</span>
              ) : (
                <>
                  <CheckCircle size={15} />
                  <span>Confirm Account</span>
                  <ChevronRight size={15} />
                </>
              )}
            </button>

            <div className="auth-footer-actions">
              <button
                type="button"
                className="btn-ghost btn-sm resend-btn"
                onClick={onResendCode}
                disabled={loading}
              >
                <RefreshCw size={12} /> Resend Code
              </button>
              <button
                type="button"
                className="btn-link"
                onClick={() => switchMode("signIn")}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* 4. FORGOT PASSWORD */}
        {mode === "forgotPassword" && (
          <div key="forgotPassword" className="auth-form tab-pane-enter">
            <div className="confirm-instructions">
              <KeyRound size={32} className="confirm-icon text-accent2" />
              <h3 className="confirm-title">Reset Password</h3>
              <p className="confirm-subtitle">
                {forgotStep === 1
                  ? "Enter your account email to receive a password reset code."
                  : `Enter the code sent to ${email} and set your new password.`}
              </p>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={onRequestReset}>
                <div className="form-field-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={15} className="input-icon" />
                    <input
                      type="email"
                      className="field auth-field"
                      placeholder="operator@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-accent auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="shimmer-text">Sending Code…</span>
                  ) : (
                    <>
                      <span>Send Reset Code</span>
                      <ChevronRight size={15} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={onConfirmReset}>
                <div className="form-field-group">
                  <label className="form-label">Reset Code</label>
                  <input
                    type="text"
                    className="field auth-field code-input"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-label">New Password</label>
                  <div className="input-with-icon">
                    <Lock size={15} className="input-icon" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="field auth-field"
                      placeholder="Min. 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-accent auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="shimmer-text">Updating…</span>
                  ) : (
                    <span>Confirm New Password</span>
                  )}
                </button>
              </form>
            )}

            <div className="auth-footer-actions">
              <button
                type="button"
                className="btn-link back-link"
                onClick={() => switchMode("signIn")}
              >
                <ArrowLeft size={13} /> Back to Sign In
              </button>
            </div>
          </div>
        )}

        {/* SECURITY FOOTER NOTE */}
        <div className="security-note auth-security-note">
          <Lock size={12} className="text-accent" />
          <span>
            Credentials authenticated via AWS Cognito SRP. End-to-end messaging keys remain strictly client-side.
          </span>
        </div>
      </div>
    </div>
  );
}
