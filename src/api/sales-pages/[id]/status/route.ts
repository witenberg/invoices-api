import { Context } from 'hono';
import { createDB, schema } from '../../../../db/db';
import { eq } from 'drizzle-orm';

export async function GET(c: Context) {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: "Sales page ID not provided" }, 400);
    }

    const db = createDB();
    
    // Fetch sales page status
    const salesPage = await db.select({
      status: schema.salesPages.status,
      id: schema.salesPages.id,
      isDeleted: schema.salesPages.isDeleted
    })
    .from(schema.salesPages)
    .where(eq(schema.salesPages.publicId, id))
    .limit(1);

    if (!salesPage || salesPage.length === 0) {
      return c.json({ error: "Sales page not found" }, 404);
    }

    return c.json({ 
      status: salesPage[0].status,
      isDeleted: salesPage[0].isDeleted || false
    });
    
  } catch (error) {
    console.error("Error fetching sales page status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
} 

export async function PATCH(c: Context) {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: "Sales page ID not provided" }, 400);
    }

    const body = await c.req.json();
    const { isDeleted } = body;
    
    if (isDeleted === undefined) {
      return c.json({ error: "isDeleted field is required" }, 400);
    }

    const db = createDB();
    
    // First check if sales page exists
    const existingSalesPage = await db.select({
      status: schema.salesPages.status,
      id: schema.salesPages.id,
      isDeleted: schema.salesPages.isDeleted
    })
    .from(schema.salesPages)
    .where(eq(schema.salesPages.publicId, id))
    .limit(1);

    if (!existingSalesPage || existingSalesPage.length === 0) {
      return c.json({ error: "Sales page not found" }, 404);
    }

    // Update the isDeleted flag
    await db.update(schema.salesPages)
      .set({ isDeleted })
      .where(eq(schema.salesPages.publicId, id));

    return c.json({ 
      success: true,
      status: existingSalesPage[0].status,
      isDeleted: isDeleted,
      message: isDeleted ? "Sales page deleted successfully" : "Sales page restored successfully"
    });
    
  } catch (error) {
    console.error("Error updating sales page status:", error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
}

