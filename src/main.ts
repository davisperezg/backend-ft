import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.URL_FRONTEND_ORIGIN });
  await app.listen(3000);

  // const microservice =
  //   await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
  //     transport: Transport.KAFKA,
  //     options: {
  //       client: {
  //         clientId: 'kafkajs-my-app',
  //         brokers: ['localhost:9092'],
  //       },
  //       consumer: {
  //         groupId: 'kafkajs-my-group',
  //       },
  //     },
  //   });
  // await microservice.listen();
}

bootstrap();
