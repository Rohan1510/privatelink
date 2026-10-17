import { 
  signUp, 
  confirmSignUp, 
  resendSignUpCode,
  signIn, 
  signOut, 
  getCurrentUser, 
  fetchAuthSession,
  resetPassword,
  confirmResetPassword
} from "aws-amplify/auth";

/**
 * 1. Register a new user with email and password
 */
export async function handleSignUp(email, password) {
  try {
    const { isSignUpComplete, nextStep } = await signUp({
      username: email,
      password: password,
      options: {
        userAttributes: { email },
      },
    });
    return { isSignUpComplete, nextStep };
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
}

/**
 * 2. Submit the 6-digit confirmation code sent to email
 */
export async function handleConfirmSignUp(email, code) {
  try {
    const { isSignUpComplete, nextStep } = await confirmSignUp({
      username: email,
      confirmationCode: code,
    });
    return { isSignUpComplete, nextStep };
  } catch (error) {
    console.error("Confirm sign up error:", error);
    throw error;
  }
}

/**
 * 3. Resend the 6-digit confirmation code to email
 */
export async function handleResendSignUpCode(email) {
  try {
    return await resendSignUpCode({ username: email });
  } catch (error) {
    console.error("Resend code error:", error);
    throw error;
  }
}

/**
 * 4. Authenticate and sign in user
 */
export async function handleSignIn(email, password) {
  try {
    const { isSignedIn, nextStep } = await signIn({
      username: email,
      password: password,
    });
    return { isSignedIn, nextStep };
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
}

/**
 * 5. Retrieve active JWT IdToken for authenticated API requests
 */
export async function getIdToken() {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString();
}

/**
 * 6. Sign out of current Amplify session
 */
export async function handleSignOut() {
  await signOut();
}

/**
 * 7. Get currently logged in Cognito user
 */
export async function getLoggedInUser() {
  try {
    const user = await getCurrentUser();
    const session = await fetchAuthSession();
    return {
      username: user.username,
      userId: user.userId,
      email: session.tokens?.idToken?.payload?.email || user.username,
      signInDetails: user.signInDetails
    };
  } catch {
    return null;
  }
}

/**
 * 8. Initiate password reset
 */
export async function handleResetPassword(email) {
  try {
    return await resetPassword({ username: email });
  } catch (error) {
    console.error("Reset password error:", error);
    throw error;
  }
}

/**
 * 9. Confirm password reset with code and new password
 */
export async function handleConfirmResetPassword(email, code, newPassword) {
  try {
    return await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword: newPassword,
    });
  } catch (error) {
    console.error("Confirm reset password error:", error);
    throw error;
  }
}
