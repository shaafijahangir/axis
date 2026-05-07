import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';

const isProduction = process.env.NODE_ENV === 'production';

const winstonLogger = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: false }),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'HH:mm:ss' }),
            winston.format.printf(
              ({ level, message, timestamp }) =>
                `${timestamp} ${level}: ${message}`,
            ),
          ),
    }),
  ],
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: winstonLogger });
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
  app.get(ConfigService); // ensure config is initialized before logging
  winstonLogger.log(
    `Application running on port ${port} [${process.env.NODE_ENV ?? 'development'}]`,
    'Bootstrap',
  );
}
void bootstrap();
