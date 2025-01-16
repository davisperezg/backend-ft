import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationError } from 'class-validator/types/validation/ValidationError';
import { ValidationErrorException } from './lib/class-validator/validation-error.exception';
import { ValidationPipeOptions } from '@nestjs/common/pipes';
import * as express from 'express';
import { ExceptionInterceptor } from './lib/interceptors/http-exception.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.static('public'));
  app.enableCors({
    origin: [process.env.URL_FRONTEND_ORIGIN, 'http://192.168.18.16:5173'],
    maxAge: 86400,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    optionsSuccessStatus: 200,
    preflightContinue: false,
  });

  const validationOptions: ValidationPipeOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors: ValidationError[]) => {
      return new ValidationErrorException(errors);
    },
  };

  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(new ExceptionInterceptor());
  await app.listen(3000);
}

bootstrap();
