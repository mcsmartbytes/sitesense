import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/sitesense/i);
  });

  test('should have correct meta tags for PWA', async ({ page }) => {
    await page.goto('/');

    // Check for theme color meta tag
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBe('#0f172a');

    // Check for apple-mobile-web-app-capable
    const appleMobileCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content');
    expect(appleMobileCapable).toBe('yes');
  });

  test('should load manifest.json', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest.name).toBe('SiteSense');
    expect(manifest.short_name).toBe('SiteSense');
  });

  test('should load service worker', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response?.status()).toBe(200);

    const content = await response?.text();
    expect(content).toContain('sitesense');
  });
});
