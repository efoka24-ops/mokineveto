/**
 * Couche d'authentification — mockée.
 * Reproduit la signature de la future API (OTP e-mail/SMS, PIN, biométrie côté backend).
 */
import type { Role, User } from '../store/useAuthStore';

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const DEMO_USER: User = {
  id: 'u1',
  name: 'Hervé TATINOU',
  email: 'tatinou@example.com',
  phone: '+237 656 78 90 00',
  role: 'ELEVEUR',
  avatarUrl: 'https://i.pravatar.cc/300?u=mokinevet-herve',
  birthDate: '29 / 01 / 1990',
};

export interface SignupInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
  birthDate?: string;
}

export async function signInWithPassword(
  emailOrPhone: string,
  _password: string,
): Promise<{ user: User; token: string }> {
  await wait();
  return {
    user: { ...DEMO_USER, email: emailOrPhone.includes('@') ? emailOrPhone : DEMO_USER.email },
    token: 'demo-token',
  };
}

export async function signUp(input: SignupInput): Promise<{ user: User; token: string }> {
  await wait();
  return {
    user: {
      ...DEMO_USER,
      name: input.name || DEMO_USER.name,
      email: input.email || DEMO_USER.email,
      phone: input.phone || DEMO_USER.phone,
      role: input.role,
      birthDate: input.birthDate ?? DEMO_USER.birthDate,
    },
    token: 'demo-token',
  };
}
