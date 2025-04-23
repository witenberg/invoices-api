import { Context } from 'hono';
import { createDB, schema } from '../../../db/db';
import { eq } from 'drizzle-orm';

export const runtime = 'edge'

export async function GET(c: Context) {
  const id = c.req.param('id');
  
  if (!id) {
    return c.json({ error: 'User ID not provided' }, 400);
  }
  
  try {
    const db = createDB();
    const user = await db.select({
      defaultCurrency: schema.users.defaultCurrency,
      defaultLanguage: schema.users.defaultLanguage,
      salesTaxName: schema.users.salesTaxName,
      salesTaxRate: schema.users.salesTaxRate,
      secondTaxName: schema.users.secondTaxName,
      secondTaxRate: schema.users.secondTaxRate,
      address: schema.users.address,
      invoiceNotes: schema.users.invoiceNotes
    })
    .from(schema.users)
    .where(eq(schema.users.userid, id))
    .limit(1);

    if (!user.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Transform the response to match the exact format expected by the frontend
    const response = {
      default_currency: user[0].defaultCurrency,
      default_language: user[0].defaultLanguage,
      sales_tax_name: user[0].salesTaxName,
      sales_tax_rate: user[0].salesTaxRate,
      second_tax_name: user[0].secondTaxName,
      second_tax_rate: user[0].secondTaxRate,
      address: user[0].address,
      invoice_notes: user[0].invoiceNotes
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return c.json({ error: 'Error fetching user settings' }, 500);
  }
}

export async function PUT(c: Context) {
  const id = c.req.param('id');
  
  if (!id) {
    return c.json({ error: 'User ID not provided' }, 400);
  }
  
  try {
    const body = await c.req.json();
    
    // Transform the incoming data to match Drizzle's column names
    const updateData = {
      defaultCurrency: body.default_currency,
      defaultLanguage: body.default_language,
      salesTaxName: body.sales_tax_name,
      salesTaxRate: body.sales_tax_rate,
      secondTaxName: body.second_tax_name,
      secondTaxRate: body.second_tax_rate,
      address: body.address,
      invoiceNotes: body.invoice_notes
    };

    const db = createDB();
    const updatedUser = await db.update(schema.users)
      .set(updateData)
      .where(eq(schema.users.userid, id))
      .returning();

    if (!updatedUser.length) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Transform the response to match the exact format expected by the frontend
    const response = {
      default_currency: updatedUser[0].defaultCurrency,
      default_language: updatedUser[0].defaultLanguage,
      sales_tax_name: updatedUser[0].salesTaxName,
      sales_tax_rate: updatedUser[0].salesTaxRate,
      second_tax_name: updatedUser[0].secondTaxName,
      second_tax_rate: updatedUser[0].secondTaxRate,
      address: updatedUser[0].address,
      invoice_notes: updatedUser[0].invoiceNotes
    };

    return c.json(response);
  } catch (error) {
    console.error('Error updating user settings:', error);
    return c.json({ error: 'Error updating user settings' }, 500);
  }
}
