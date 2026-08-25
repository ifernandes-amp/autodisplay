import { SetMetadata } from '@nestjs/common';
import type { PerfilUsuario } from '@prisma/client';
import { ROLES_KEY } from '../auth.constants';

export const Roles = (
  ...roles: PerfilUsuario[]
): ReturnType<typeof SetMetadata> => SetMetadata(ROLES_KEY, roles);
