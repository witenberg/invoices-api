import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';

export async function POST(c: Context) {
  const db = createDB();
  const { userId } = await c.req.json();

  if (!userId) {
    return c.json({ 
      error: 'Missing required parameters',
      params: { userId }
    }, 400);
  }

  try {
    const clients = await db
      .select()
      .from(schema.clients)
      .where(
        eq(schema.clients.userid, parseInt(userId))
      );

    const headers = 'Name,Email,Address,Status,Currency,Language\n';
    const data = clients.map(client => 
      `"${client.name}","${client.email}","${client.address || ''}","${client.status || ''}","${client.currency || ''}","${client.language || ''}"`
    );

    const csvContent = headers + data.join('\n');

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="clients.csv"',
      },
    });

  } catch (error) {
    console.error('Error generating clients CSV:', error);
    return c.json({ error: 'Failed to generate clients CSV' }, 500);
  }
} 