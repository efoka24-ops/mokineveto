import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

/**
 * Client Prisma.
 *
 * L'hébergement de production (Camoo, mutualisé) applique des limites de
 * threads et de processus qui empêchent le moteur natif de Prisma de démarrer :
 * en mode bibliothèque, le runtime Tokio panique (« timer has gone away ») ; en
 * mode binaire, le processus du moteur ne peut pas être lancé (`EAGAIN`).
 *
 * L'adaptateur de pilote contourne ce blocage en confiant les connexions à un
 * client MySQL purement JavaScript. Il est activé dès qu'une URL MySQL est
 * fournie, ce qui couvre aussi bien la production que le développement local.
 */

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? '';

  const log: ('query' | 'error' | 'warn')[] =
    process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'];

  if (url.startsWith('mysql://')) {
    const adapter = new PrismaMariaDb(url);
    return new PrismaClient({ adapter, log });
  }

  // Repli : moteur natif, pour tout autre fournisseur de base.
  return new PrismaClient({ log });
}

export const prisma = globalForPrisma.prisma || createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
