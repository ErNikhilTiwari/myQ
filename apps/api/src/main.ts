import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend and smart TV displays
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
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

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Static web frontend serving (Unified Local Hosting)
  const webDistCandidates = [
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
    path.resolve(process.cwd(), '../web/dist'),
  ];
  const webDistPath = webDistCandidates.find((p) => fs.existsSync(p));

  if (webDistPath) {
    logger.log(`📦 Serving Web Frontend from: ${webDistPath}`);
    app.use(express.static(webDistPath));

    const httpAdapter = app.getHttpAdapter();
    const expressInstance = httpAdapter.getInstance();
    expressInstance.get('*', (req: any, res: any, next: any) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
        return next();
      }
      res.sendFile(path.join(webDistPath, 'index.html'));
    });
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port, '0.0.0.0');

  // Discover local network IPv4 address for TV and phone access
  const networkInterfaces = os.networkInterfaces();
  const localIps: string[] = [];
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIps.push(net.address);
      }
    }
  }

  logger.log(`🚀 QueueApp Unified Server is LIVE!`);
  logger.log(`👉 Access on this PC:      http://localhost:${port}`);
  if (localIps.length > 0) {
    logger.log(`📺 Access on Smart TV / Phone: http://${localIps[0]}:${port}`);
  }
}

bootstrap();
