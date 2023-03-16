// validation-error.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { ValidationErrorException } from './validation-error.exception';

@Catch(ValidationErrorException)
export class ValidationErrorFilter implements ExceptionFilter {
  catch(exception: ValidationErrorException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const constraints = exception
      .getData()
      .map((a) =>
        Object.keys(a.constraints).find((b) => b === 'whitelistValidation')
          ? `[${a.property.toUpperCase()}] no es válido`
          : Object.values(a.constraints)[0],
      );

    response.status(status).json({
      statusCode: status,
      message: constraints,
      error: exception.message,
    });
  }
}
