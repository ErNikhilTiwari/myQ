import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiResponse } from '@queueapp/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'An unexpected error occurred.';
    let details: any = undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      message = exceptionResponse.message || message;
      details = exceptionResponse.error || undefined;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(`[${request.method}] ${request.url} Status: ${status} - ${message}`, exception instanceof Error ? exception.stack : undefined);

    // Prevent sensitive internal database or system error disclosure in production
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && process.env.NODE_ENV === 'production') {
      message = 'An unexpected internal error occurred. Please try again later.';
      details = undefined;
    }

    const errorBody: ApiResponse = {
      success: false,
      error: {
        code: `HTTP_${status}`,
        message: Array.isArray(message) ? message.join(', ') : message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(errorBody);
  }
}
