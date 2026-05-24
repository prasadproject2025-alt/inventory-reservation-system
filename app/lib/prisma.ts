import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  // allow global prisma across hot-reloads in development
  // eslint-disable-next-line vars-on-top
  var prisma: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable');
}

export const prisma = global.prisma || new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
