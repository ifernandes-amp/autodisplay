import { Global, Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [AuditoriaModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
