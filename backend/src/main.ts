import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Enable CORS
  app.enableCors({
    origin: [
      'https://school-payment-app-delta.vercel.app',
      configService.get('FRONTEND_URL'),
      'http://localhost:3000',
      'http://localhost:5173',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Add root endpoint handler
  app.use('/', (req, res, next) => {
    if (req.url === '/') {
      res.json({
        message: 'School Payment System API is working successfully! 🎓',
        status: 'active',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        apiEndpoint: '/api',
        documentation: 'Visit /api for detailed endpoint information',
        frontend: configService.get('FRONTEND_URL') || 'https://school-payment-app-delta.vercel.app'
      });
    } else {
      next();
    }
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
