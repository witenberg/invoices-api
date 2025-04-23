import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

interface SalesPageData {
  userid: string
  title: string
  description?: string | null
  price: string
  currency: string
  frequency: string
  image_url?: string | null
  notes?: string | null
  accept_credit_cards: boolean
  accept_paypal: boolean
  discount?: string | null
  sales_tax_name?: string | null
  sales_tax_rate?: string | null
  second_tax_name?: string | null
  second_tax_rate?: string | null
  status: string
}

export async function POST(c: Context) {
  try {
    const data = await c.req.json();
    const db = createDB();

    // First, get the user's Stripe account ID
    const user = await db
      .select({ stripeAccountid: schema.users.stripeAccountid })
      .from(schema.users)
      .where(eq(schema.users.userid, data.userId))
      .limit(1);

    if (!user[0]?.stripeAccountid) {
      return c.json({ error: 'User has not connected Stripe account' }, 400);
    }

    const salesPageData: SalesPageData = {
      userid: data.userId,
      title: data.content.title,
      description: data.content.description || null,
      price: data.content.price.toString(),
      currency: data.options.currency,
      frequency: data.options.frequency,
      notes: data.options.notes || null,
      accept_credit_cards: Boolean(data.options.acceptcreditcards),
      accept_paypal: Boolean(data.options.acceptpaypal),
      discount: data.options.discount ? data.options.discount.toString() : null,
      sales_tax_name: data.options.salestax?.name || null,
      sales_tax_rate: data.options.salestax?.rate ? data.options.salestax.rate.toString() : null,
      second_tax_name: data.options.secondtax?.name || null,
      second_tax_rate: data.options.secondtax?.rate ? data.options.secondtax.rate.toString() : null,
      status: data.isDraft ? 'Draft' : 'Published'
    };

    // Handle image upload URL if present
    if (data.content.image) {
      // TODO: Implement image upload to storage service
      // salesPageData.image_url = await uploadImage(data.content.image);
    }

    let savedId: string | undefined;

    if (data.id) {
      // Update existing sales page
      await db.update(schema.salesPages)
        .set(salesPageData)
        .where(eq(schema.salesPages.id, data.id));
      savedId = data.id;
    } else {
      // Create new sales page
      const result = await db.insert(schema.salesPages)
        .values(salesPageData)
        .returning({ insertedId: schema.salesPages.id });
      savedId = result[0]?.insertedId;
    }

    if (!savedId) {
      throw new Error("Failed to save sales page");
    }

    // Save custom field if present
    if (data.customField) {
      // TODO: Implement custom field saving logic
      // This would involve another table in the database
    }

    // Save digital product if present
    if (data.digitalProduct) {
      // TODO: Implement digital product saving logic
      // This would involve another table and potentially file upload handling
    }

    return c.json({ 
      success: true, 
      id: savedId,
      status: salesPageData.status 
    });

  } catch (error) {
    console.error("Error saving sales page:", error);
    return c.json({ 
      error: "Failed to save sales page",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
}
