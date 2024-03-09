import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationError } from 'class-validator/types/validation/ValidationError';
import { ValidationErrorException } from './lib/class-validator/validation-error.exception';
import { ValidationPipeOptions } from '@nestjs/common/pipes';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(express.static('public'));
  app.enableCors({
    origin: [process.env.URL_FRONTEND_ORIGIN, 'http://192.168.1.44:5173'],
  });

  const validationOptions: ValidationPipeOptions = {
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors: ValidationError[]) => {
      return new ValidationErrorException(errors);
    },
  };

  app.useGlobalPipes(new ValidationPipe(validationOptions));
  await app.listen(3000);
}

bootstrap();
