export type PerfilUsuario = 'LANCAMENTO' | 'EXECUTIVO';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

export interface LoginPayload {
  email: string;
  senha: string;
}

export interface CsrfResponse {
  csrfToken: string;
}
