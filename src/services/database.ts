import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

export class DatabaseService {
  private static instance: PrismaClient;

  private constructor() { }

  public static getInstance(): PrismaClient {
    if (!DatabaseService.instance) {
      const pool = new Pool({ connectionString: env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      DatabaseService.instance = new PrismaClient({ adapter });
    }
    return DatabaseService.instance;
  }

  public static async connect() {
    try {
      await this.getInstance().$connect();
      console.log('--- Database: Connected successfully');
    } catch (error) {
      console.error('--- Database: Connection failed', error);
      process.exit(1);
    }
  }

  public static async disconnect() {
    await this.getInstance().$disconnect();
  }
}

export const db = DatabaseService.getInstance();
