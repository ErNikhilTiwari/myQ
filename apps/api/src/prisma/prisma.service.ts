import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    let databaseUrl = process.env.DATABASE_URL;

    // In development or when using SQLite (file:), ensure the database path is always absolute
    // to prevent working-directory mismatches between CLI, root, and subfolder execution.
    if (!databaseUrl || databaseUrl.startsWith('file:')) {
      const candidates = [
        path.resolve(process.cwd(), 'apps/api/prisma/dev.db'),
        path.resolve(process.cwd(), 'prisma/dev.db'),
        path.resolve(__dirname, '../../../prisma/dev.db'),
        path.resolve(__dirname, '../../prisma/dev.db'),
      ];

      let resolvedDbPath = candidates[0];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          resolvedDbPath = cand;
          break;
        }
      }

      databaseUrl = `file:${resolvedDbPath}`;
      new Logger('PrismaService').log(`SQLite Database canonical path resolved to: ${resolvedDbPath}`);
    }

    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
