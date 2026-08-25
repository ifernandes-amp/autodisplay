import type { AuthenticatedUser } from '../auth/types/authenticated-user';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
      sessionToken?: string;
      correlationId?: string;
    }
  }
}

export {};
