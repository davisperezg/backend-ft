import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AntiSpamGuard implements CanActivate {
  private requestTimestamps = new Map<string, number>(); // clave: usuario o IP, valor: timestamp

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userIdentifier = request.ip; // Puedes usar request.user si tienes autenticación
    const currentTime = Date.now();
    const lastRequestTime = this.requestTimestamps.get(userIdentifier);
    const TIME = 5000;

    // Si existe un último tiempo de solicitud y no han pasado 5 segundos, se rechaza
    if (lastRequestTime && currentTime - lastRequestTime < TIME) {
      throw new HttpException(
        `Vuelve a consultar en 5seg.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Actualiza el tiempo de la última solicitud
    this.requestTimestamps.set(userIdentifier, currentTime);
    return true;
  }
}
