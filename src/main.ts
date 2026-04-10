// File 2
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Activating class-validator on every end-point
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips fields not in the DTO
      forbidNonWhitelisted: true, // throws error if unknown fields are sent
      transform: true, // transforms plain JSON into DTO class instances
    }),
  );

  // serve uploads folder as static files
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  //

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('PSEB—Task API')
    .setDescription('User Authentication and Profile Management')
    .setVersion('1.0')
    .addBearerAuth() // ← enables JWT token input in Swagger UI
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
