import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { INestApplication } from '@nestjs/common';

export class CorsIoAdapter extends IoAdapter {
  constructor(app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: [
          process.env.URL_FRONTEND_ORIGIN,
          process.env.URL_FRONTEND_ORIGIN_HOST,
        ].filter(Boolean),
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      },
    });
  }
}
