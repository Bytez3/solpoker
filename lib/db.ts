import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Enhanced DATABASE_URL with connection pooling parameters
const getDatabaseUrl = () => {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return baseUrl;
  
  // Add connection pooling parameters for high concurrency
  const url = new URL(baseUrl);
  url.searchParams.set('connection_limit', '20');      // Max connections
  url.searchParams.set('pool_timeout', '10');          // Pool timeout in seconds
  url.searchParams.set('connect_timeout', '10');       // Connection timeout in seconds
  url.searchParams.set('statement_timeout', '30000');  // Statement timeout in milliseconds
  
  return url.toString();
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

