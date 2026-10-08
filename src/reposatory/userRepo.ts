// user repo 
import { usersTable } from "../db/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";


const userRepo = {
    async findByEmail(email: string): Promise<{ id: number; name: string; email: string, passwordHash: string } | null> {
        let existing;
        try {
            existing = await db
                .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, passwordHash: usersTable.passwordHash })
                .from(usersTable)
                .where(eq(usersTable.email, email))
                .limit(1);
        } catch (error) {
            console.error("Error fetching user by email:", error);
            throw error;
        }
        return existing.length > 0 ? existing[0] : null;
    },
    async createUser(name: string, email: string, passwordHash: string): Promise<{ id: number; name: string; email: string }> {
        let user;
        try {
            [user] = await db
                .insert(usersTable)
                .values({ name, email, passwordHash })
                .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });
        } catch (error) {
            console.error("Error creating user:", error);
            throw error;
        }
        return user;
    }
}

export default userRepo;

