import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
  });

  test('should display form elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toBeVisible();
  });
});