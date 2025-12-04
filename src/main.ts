import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enabled CORS with proper configuration
  app.enableCors({
    origin: 'http://localhost:5173', // Your frontend URL
    credentials: true, //cookies allowed/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Allow-Headers',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Authorization'], // Exposed auth header to frontend
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Optional: Global prefix for all routes
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`✅ CORS enabled for: http://localhost:5173`);
}
bootstrap();
