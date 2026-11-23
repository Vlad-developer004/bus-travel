import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

export function configureApp(app: NestExpressApplication) {
  const isProd = process.env.NODE_ENV === 'production';

  app.set('trust proxy', 1);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: process.env.WEB_URL ?? 'http://localhost:3000', credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  if (!isProd || process.env.ENABLE_SWAGGER === 'true') {
    const doc = new DocumentBuilder()
      .setTitle('BusTravel API')
      .setDescription('Search trips, pick seats, book and pay.')
      .setVersion('2.0')
      .addBearerAuth()
      .addCookieAuth('bt_access')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }
}
