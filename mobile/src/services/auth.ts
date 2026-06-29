/**
 * Auth service — real backend implementation
 * Wraps useAuthStore actions for screen components
 */
import { useAuthStore, type User } from '../store/useAuthStore';
import type { SignupPayload, LoginPayload, UpdateProfilePayload } from './api';

export interface SignupInput extends Omit<SignupPayload, 'role'> {
  role: 'ELEVEUR' | 'VETERINAIRE';
}

export async function signUp(input: SignupInput): Promise<{ user: User; token: string }> {
  const { signup } = useAuthStore.getState();
  await signup(input);
  const { user, token } = useAuthStore.getState();
  if (!user || !token) throw new Error('Signup succeeded but auth state empty');
  return { user, token };
}

export async function signInWithPassword(
  emailOrPhone: string,
  password: string,
): Promise<{ user: User; token: string }> {
  const { login } = useAuthStore.getState();
  await login({ emailOrPhone, password });
  const { user, token } = useAuthStore.getState();
  if (!user || !token) throw new Error('Login succeeded but auth state empty');
  return { user, token };
}

export async function updateUserProfile(patch: UpdateProfilePayload): Promise<User> {
  const { updateProfile } = useAuthStore.getState();
  await updateProfile(patch);
  const { user } = useAuthStore.getState();
  if (!user) throw new Error('Update succeeded but user not set');
  return user;
}

export async function signOut(): Promise<void> {
  const { signOut: doSignOut } = useAuthStore.getState();
  await doSignOut();
}

export async function isLoggedIn(): Promise<boolean> {
  return useAuthStore.getState().token !== null;
}

export async function getCurrentUser(): Promise<User | null> {
  return useAuthStore.getState().user;
}

export async function getToken(): Promise<string | null> {
  return useAuthStore.getState().token;
}
