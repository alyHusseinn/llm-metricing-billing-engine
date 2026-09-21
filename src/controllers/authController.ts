import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { planTable, subscriptionTable, usersTable } from "../db/schema";
import { env } from "../utils/env";


const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});


const SALT_ROUNDS = 12;

function signToken(userId: number): string {
  const secret = env.JWT_SECRET!;
  const expiresIn = (env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"];
  return jwt.sign({ userId }, secret, { expiresIn });
}


/**
 * POST /auth/signup
 * Body: { name, email, password }
 */
export async function signup(req: Request, res: Response): Promise<void> {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash })
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email });

  // create free subscription when singup available for 30 days
  const [freePlan] = await db.select().from(planTable).where(eq(planTable.name, "Free"))
  await db.insert(subscriptionTable).values({userId: user.id, status: "Active", planId: freePlan.id})

  const token = signToken(user.id);

  res.status(201).json({ token, subscriptionTyep: "Free, 100k tokens available", user: {name: user.name, email: user.email} });
}

/**
 * POST /auth/login
 * Body: { email, password }
 */
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user.id);

  res.json({
    token,
    user: { name: user.name, email: user.email },
  });
}