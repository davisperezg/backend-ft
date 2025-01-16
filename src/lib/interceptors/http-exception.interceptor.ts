import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ExceptionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((err) => {
        // Si ya es un HttpException, se reenvía tal cual
        if (err instanceof HttpException) {
          return throwError(() => err);
        }

        // Para errores inesperados, se encapsulan en una excepción genérica
        const status = HttpStatus.INTERNAL_SERVER_ERROR;
        const message = `Ocurrió un error inesperado. ${
          err.message || 'Sin detalles adicionales.'
        }`;

        return throwError(() => new HttpException(message, status));
      }),
    );
  }
}
