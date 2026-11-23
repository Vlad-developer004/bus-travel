import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import express from 'express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

let server: express.Express | undefined;

async function boot() {
  const instance = express();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(instance), { rawBody: true });
  configureApp(app);
  await app.init();
  return instance;
}

export default async function handler(req: Request, res: Response) {
  server ??= await boot();
  server(req, res);
}
