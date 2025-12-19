import { test, expect } from '@playwright/test';

test.describe('API Routes', () => {
  test.describe('POST /api/auth/login', () => {
    test('should return 400 for invalid request body', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {},
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('should return 400 for invalid email format', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'not-an-email',
          password: 'password123',
        },
      });
      expect(response.status()).toBe(400);
    });

    test('should return 400 for short password', async ({ request }) => {
      const response = await request.post('/api/auth/login', {
        data: {
          email: 'test@example.com',
          password: '123',
        },
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('POST /api/auth/register', () => {
    test('should return 400 for invalid request body', async ({ request }) => {
      const response = await request.post('/api/auth/register', {
        data: {},
      });
      expect(response.status()).toBe(400);

      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    test('should return 400 for password under 8 characters', async ({ request }) => {
      const response = await request.post('/api/auth/register', {
        data: {
          email: 'test@example.com',
          password: '1234567',
          full_name: 'Test User',
        },
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('GET /api/jobs', () => {
    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/jobs');
      // Should return 401 unauthorized or redirect
      expect([401, 302, 403]).toContain(response.status());
    });
  });

  test.describe('GET /api/contacts', () => {
    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/contacts');
      expect([401, 302, 403]).toContain(response.status());
    });
  });
});
