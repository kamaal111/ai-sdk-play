import {PrismaClient} from '../../generated/prisma';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ['query'],
    });

// Store Prisma instance globally in development to prevent multiple connections during hot reloads
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
