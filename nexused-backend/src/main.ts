import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Cookie parser middleware (must be before CORS)
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('app.frontendUrl'),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix(configService.get<string>('app.apiPrefix') || 'api');

  const port = configService.get<number>('app.port') ?? 3001;
  await app.listen(port);
  console.log(
    `🚀 Application is running on: http://localhost:${port}/${configService.get<string>('app.apiPrefix')}`,
  );
}
void bootstrap();
