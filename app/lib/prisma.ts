import { PrismaClient } from '../app/generated/prisma/client';

declare global {
  // allow global prisma across hot-reloads in development
  // eslint-disable-next-line vars-on-top
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new (PrismaClient as any)();

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

export default prisma;
