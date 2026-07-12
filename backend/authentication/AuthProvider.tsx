/**
 * src/features/auth/AuthProvider.tsx
 *
 * React context wiring the Authentication module into the component
 * tree: tracks the live Supabase session and the corresponding
 * customer profile, refetching the profile on every sign-in and
 * clearing it on sign-out. This is the only place in the frontend
 * that should call onAuthStateChange directly — every component below
 * it consumes state via useAuth().
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  getSession,
  getCurrentCustomerProfile,
  onAuthStateChange,
  signInWithEmail,
  signOut as signOutService,
  signUpWithEmail,
  requestPhoneOtp,
  verifyPhoneOtp,
  updateCustomerProfile,
} from './auth.service';
import type {
  CustomerProfile,
  SignInWithEmailParams,
  SignUpWithEmailParams,
  SignUpWithPhoneParams,
  VerifyPhoneOtpParams,
  UpdateCustomerProfileParams,
} from './auth.types';

interface AuthContextValue {
  /** Undefined while the initial session check is still in flight. */
  session: Session | null | undefined;
  profile: CustomerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (params: SignInWithEmailParams) => Promise<void>;
  signUp: (params: SignUpWithEmailParams) => Promise<void>;
  requestOtp: (params: SignUpWithPhoneParams) => Promise<void>;
  verifyOtp: (params: VerifyPhoneOtpParams) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (params: UpdateCustomerProfileParams) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const current = await getCurrentCustomerProfile();
    setProfile(current);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const initialSession = await getSession();
      if (!isMounted) return;

      setSession(initialSession);
      if (initialSession) {
        await refreshProfile();
      }
      setIsLoading(false);
    }

    init();

    const unsubscribe = onAuthStateChange(async (nextSession) => {
      if (!isMounted) return;

      setSession(nextSession);
      if (nextSession) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [refreshProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isAuthenticated: Boolean(session),
      isLoading,
      signIn: async (params) => {
        await signInWithEmail(params);
      },
      signUp: async (params) => {
        await signUpWithEmail(params);
      },
      requestOtp: async (params) => {
        await requestPhoneOtp(params);
      },
      verifyOtp: async (params) => {
        await verifyPhoneOtp(params);
      },
      signOut: async () => {
        await signOutService();
      },
      updateProfile: async (params) => {
        const updated = await updateCustomerProfile(params);
        setProfile(updated);
      },
      refreshProfile,
    }),
    [session, profile, isLoading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be called within an <AuthProvider>.');
  }
  return ctx;
}
