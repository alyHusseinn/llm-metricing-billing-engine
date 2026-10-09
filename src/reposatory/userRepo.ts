// user repo 
import { usersTable } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";


const userRepo = {
    async findByEmail(email: string): Promise<{ id: number; name: string; email: string, passwordHash: string } | null> {
        const [existing] = await db
            .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, passwordHash: usersTable.passwordHash })
            .from(usersTable)
            .where(eq(usersTable.email, email))
            .limit(1);
        return existing || null;
    },
    async getUserById(userId: number): Promise<{ name: string; email: string, passwordHash: string } | null> {
        const [user] = await db
            .select({ name: usersTable.name, email: usersTable.email, passwordHash: usersTable.passwordHash })
            .from(usersTable)
            .where(eq(usersTable.id, userId));
        return user || null;
    },

    async createUser(name: string, email: string, passwordHash: string): Promise<{ id: number; name: string; email: string }> {
        const [user] = await db
            .insert(usersTable)
            .values({ name, email, passwordHash })
            .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });
        return user;
    }
}

export default userRepo;

