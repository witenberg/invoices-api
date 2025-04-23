import { Context } from 'hono'
import { createDB, schema } from '../../../db/db'
import { eq } from 'drizzle-orm'

export async function GET(c: Context) {
    const id = c.req.param('id')
    const db = createDB()
    const user = await db.query.users.findFirst({
        where: eq(schema.users.userid, id)
    })

    if (!user) {
        return c.json({ error: 'User not found' }, 404)
    }

    return c.json(user)
}
