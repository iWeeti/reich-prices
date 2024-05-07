import { eq } from "drizzle-orm";
import { db } from "./database";
import { users } from "./database/schema";

export async function getOrCreateUser(id: string) {
    let user = await db.query.users.findFirst({
        where: eq(users.id, id),
    });

    if (!user) {
        user = (
            await db
                .insert(users)
                .values({
                    id,
                })
                .returning()
        )[0];
    }

    if (!user) {
        throw new Error("Failed to get and create a user.");
    }

    return user;
}
export async function getUser(id: string) {
    let user = await db.query.users.findFirst({
        where: eq(users.id, id),
    });
    return user;
}
