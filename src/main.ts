import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // global validation pipe(FOR RENDER)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      transform: true, // Automatically transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw errors for non-whitelisted properties
      transformOptions: {
        enableImplicitConversion: true, // Convert string to numbers, etc.
      },
    }),
  );

  // Enhanced CORS configuration for production
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? [
          process.env.FRONTEND_URL || 'https://your-frontend.onrender.com',
          'http://localhost:5173',
          'http://localhost:3000',
        ]
      : ['http://localhost:5173', 'http://localhost:3000'];

  app.enableCors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://quickdish-frontend-2b6x.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
});


  // Global prefix for all routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001; //3001 for Render compatibility
  await app.listen(port);

  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`🔒 Validation pipe enabled`);
}
bootstrap();
