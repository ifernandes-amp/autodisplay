import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { AuditContext } from './audit-context.types';

@Injectable()
export class AuditContextService {
  private readonly storage = new AsyncLocalStorage<AuditContext>();

  run<T>(context: AuditContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): AuditContext | undefined {
    return this.storage.getStore();
  }
}
