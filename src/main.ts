import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Cognitfy Google Ads API')
    .setDescription(
      'API para automatización de campañas Google Ads basadas en tendencias para medios de comunicación',
    )
    .setVersion('1.0')
    .addTag('campaigns', 'Gestión de campañas publicitarias')
    .addTag('trends', 'Obtención de tendencias de Google Trends')
    .addTag('articles', 'Gestión de artículos del cliente')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
