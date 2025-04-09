import { drizzle } from 'drizzle-orm/postgres-js';
import 'dotenv/config';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';

// Initialize the connection
// const connectionString = process.env.DATABASE_URL!;
// const client = postgres(connectionString, {prepare: false});
// export const db = drizzle(client, { schema });

export function createDB() {
    const connectionString = process.env.DATABASE_URL!;
    const client = postgres(connectionString, {prepare: false});
    return drizzle(client, { schema, ...relations });
  }

// Export schema and relations for use in routes
export { schema, relations }; 