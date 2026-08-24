import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  errors?: string[] | Record<string, unknown>;
}

@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: string[] | Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const body = exceptionResponse as Record<string, unknown>;
        message = typeof body.message === 'string' ? body.message : message;
        if (Array.isArray(body.message)) {
          errors = body.message as string[];
          message = 'Validation failed';
        } else if (body.errors !== undefined) {
          errors = body.errors as string[] | Record<string, unknown>;
        }
      }
    }

    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          path: request.url,
          method: request.method,
          err: exception instanceof Error ? exception : undefined,
        },
        'Unhandled server error',
      );
      message = 'Internal server error';
      errors = undefined;
    }

    const body: ErrorResponseBody = {
      statusCode,
      message,
      ...(errors !== undefined ? { errors } : {}),
    };

    response.status(statusCode).json(body);
  }
}
