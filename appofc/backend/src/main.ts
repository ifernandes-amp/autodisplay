import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import type { EnvConfig } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService<EnvConfig, true>);
  const env = {
    nodeEnv: configService.get('NODE_ENV', { infer: true }),
    port: configService.get('PORT', { infer: true }),
    frontendOrigin: configService.get('FRONTEND_ORIGIN', { infer: true }),
  };

  app.useLogger(app.get(Logger));
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cookieParser());
  app.use(
    new CorrelationIdMiddleware().use.bind(new CorrelationIdMiddleware()),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );

  if (env.nodeEnv === 'development') {
    app.enableCors({
      origin: env.frontendOrigin,
      credentials: true,
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  if (env.nodeEnv === 'production') {
    const frontendDist = join(process.cwd(), '..', 'frontend', 'dist');
    app.useStaticAssets(frontendDist, { index: false });
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api') || req.path === '/health') {
        next();
        return;
      }

      res.sendFile(join(frontendDist, 'index.html'), (error?: Error) => {
        if (error) {
          next(error);
        }
      });
    });
  }

  await app.listen(env.port);
}

void bootstrap();
