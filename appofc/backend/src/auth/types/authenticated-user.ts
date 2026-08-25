import type { PerfilUsuario } from '@prisma/client';

export interface AuthenticatedUser {
  readonly id: string;
  readonly empresaId: string;
  readonly nome: string;
  readonly email: string;
  readonly perfil: PerfilUsuario;
}

export interface SessionValidationResult {
  readonly user: AuthenticatedUser;
  readonly sessionId: string;
  readonly rawToken: string;
}

export interface CsrfTokenPair {
  readonly token: string;
  readonly cookieValue: string;
}
