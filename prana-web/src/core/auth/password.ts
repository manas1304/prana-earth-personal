import bcrypt from "bcryptjs";

export async function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
