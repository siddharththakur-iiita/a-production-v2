/**
 * src/features/auth/index.ts
 *
 * Public surface of the Authentication module. Other feature modules
 * and page components should import from here, not from the
 * individual files directly — this is the boundary that keeps the
 * module's internals (e.g. exact error-mapping logic, raw service
 * function names) free to change without breaking callers.
 */
export { AuthProvider, useAuth } from './AuthProvider';
export { RequireAuth } from './RequireAuth';

export {
  signUpWithEmail,
  requestPhoneOtp,
  verifyPhoneOtp,
  signInWithEmail,
  signInAnonymously,
  getSession,
  ensureSession,
  getCurrentUser,
  signOut,
  onAuthStateChange,
  requestPasswordReset,
  updatePassword,
  getCurrentCustomerProfile,
  updateCustomerProfile,
  completeProfileSetup,
} from './auth.service';

export type {
  AuthSession,
  CustomerProfile,
  SignUpWithEmailParams,
  SignInWithEmailParams,
  SignUpWithPhoneParams,
  VerifyPhoneOtpParams,
  UpdateCustomerProfileParams,
  AuthMethod,
} from './auth.types';

export { AppAuthError } from './auth.errors';
export type { AuthErrorCode } from './auth.errors';
