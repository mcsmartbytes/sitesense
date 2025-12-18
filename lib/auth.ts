import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getTurso, generateId } from './turso';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_in_production';
const TOKEN_EXPIRY = '7d';
const COOKIE_NAME = 'sitesense_auth';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  industry_id: string | null;
  created_at: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Create user in database
export async function createUser(
  email: string,
  password: string,
  fullName?: string,
  companyName?: string
): Promise<User | null> {
  const client = getTurso();
  const id = generateId();
  const hashedPassword = await hashPassword(password);

  try {
    await client.execute({
      sql: `INSERT INTO users (id, email, password_hash, full_name, company_name) VALUES (?, ?, ?, ?, ?)`,
      args: [id, email.toLowerCase(), hashedPassword, fullName || null, companyName || null],
    });

    const result = await client.execute({
      sql: `SELECT id, email, full_name, company_name, industry_id, created_at FROM users WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) return null;
    return result.rows[0] as unknown as User;
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

// Find user by email
export async function findUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  const client = getTurso();
  const result = await client.execute({
    sql: `SELECT id, email, password_hash, full_name, company_name, industry_id, created_at FROM users WHERE email = ?`,
    args: [email.toLowerCase()],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as User & { password_hash: string };
}

// Find user by ID
export async function findUserById(id: string): Promise<User | null> {
  const client = getTurso();
  const result = await client.execute({
    sql: `SELECT id, email, full_name, company_name, industry_id, created_at FROM users WHERE id = ?`,
    args: [id],
  });

  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as User;
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  return findUserById(payload.userId);
}

// Get auth token from cookie
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

// Login user
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) return null;

  const token = generateToken({ userId: user.id, email: user.email });

  // Return user without password_hash
  const { password_hash, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

// Update user profile
export async function updateUser(
  userId: string,
  updates: { full_name?: string; company_name?: string; industry_id?: string }
): Promise<User | null> {
  const client = getTurso();

  const fields: string[] = [];
  const values: (string | null)[] = [];

  if (updates.full_name !== undefined) {
    fields.push('full_name = ?');
    values.push(updates.full_name);
  }
  if (updates.company_name !== undefined) {
    fields.push('company_name = ?');
    values.push(updates.company_name);
  }
  if (updates.industry_id !== undefined) {
    fields.push('industry_id = ?');
    values.push(updates.industry_id);
  }

  if (fields.length === 0) return findUserById(userId);

  values.push(userId);
  await client.execute({
    sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    args: values,
  });

  return findUserById(userId);
}
