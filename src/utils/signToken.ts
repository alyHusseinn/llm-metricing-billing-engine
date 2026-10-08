import jwt from "jsonwebtoken";
import { env } from "./env";

function signToken(userId: number): string {
  const secret = env.JWT_SECRET!;
  const expiresIn = (env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"];
  return jwt.sign({ userId }, secret, { expiresIn });
}

export { signToken };