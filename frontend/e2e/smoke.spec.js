import { test, expect } from '@playwright/test';
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// One deliberately narrow smoke test proving the E2E harness works end to
// end (real browser + real backend + real ephemeral DB) — not a full E2E
// suite. See TESTING_CI_SCOPE.md for why this stays narrow for now.

const TEST_IMAGE_PATH = path.join(os.tmpdir(), 'e2e-smoke-test-image.png');
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test.beforeAll(() => {
  fs.writeFileSync(TEST_IMAGE_PATH, Buffer.from(PNG_BASE64, 'base64'));
});

test.afterAll(() => {
  fs.rmSync(TEST_IMAGE_PATH, { force: true });
});

test('signup -> confirm -> signin -> create post -> logout', async ({ page }) => {
  const ts = Date.now();
  const email = `e2e.smoke.${ts}@example.com`;
  const password = 'Test@1234';

  await page.goto('/sign-up');
  await page.getByLabel('First Name').fill('E2E');
  await page.getByLabel('Last Name').fill('Smoke');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();

  await expect(page).toHaveURL(/\/sign-in/);

  // Real email confirmation isn't practical in an automated test — flip it
  // directly, the same pattern every disposable verification script this
  // project has used all session (see CLAUDE.md's live-testing methodology).
  await mongoose.connect(process.env.DB_URL);
  await mongoose.connection.collection('users').updateOne({ email }, { $set: { confirmed: true } });
  await mongoose.disconnect();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByText('Home Feed')).toBeVisible();

  await page.goto('/create-post');
  await page.getByLabel('Description').fill('E2E smoke test post');
  await page.locator('input[type="file"]').setInputFiles(TEST_IMAGE_PATH);
  await page.getByRole('button', { name: 'Create Post' }).click();

  await expect(page).toHaveURL('/', { timeout: 15000 });
  await expect(page.getByText('E2E smoke test post')).toBeVisible();

  await page.getByText('Logout').click();
  await expect(page).toHaveURL(/\/sign-in/);
});
