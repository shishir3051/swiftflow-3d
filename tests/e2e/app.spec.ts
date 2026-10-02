import { test, expect } from '@playwright/test';

test.describe('SwiftFlow 3D E2E Test Suite', () => {
  test('homepage loads hero, interactive globe, and scroll sections', async ({ page }) => {
    await page.goto('/');

    // Verify Title and Headline
    await expect(page).toHaveTitle(/SwiftFlow 3D/);
    const heroHeading = page.locator('h1');
    await expect(heroHeading).toBeVisible();
    await expect(heroHeading).toContainText('Interactive 3D Interbank Rail');

    // Verify Synthetic Disclaimer is prominently displayed
    const disclaimer = page.locator('aside[aria-label="Synthetic Data Compliance Notice"]');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText('EDUCATIONAL & SIMULATION NOTICE');

    // Verify Corridor Registry rendered
    const corridorRegistry = page.locator('div[role="region"][aria-label="Active Simulated Payment Corridor Registry"]');
    await expect(corridorRegistry).toBeVisible();

    // Verify Live Converter Studio is present
    const converterSection = page.locator('#converter-section');
    await expect(converterSection).toBeVisible();
    await expect(converterSection).toContainText('MT103 → ISO 20022');
  });

  test('converter panel executes conversion and renders validated XML', async ({ page }) => {
    await page.goto('/#converter-section');

    const convertBtn = page.getByRole('button', { name: /Convert & Stream ISO 20022/i });
    await expect(convertBtn).toBeVisible();

    // Click Convert & Stream
    await convertBtn.click();

    // Wait for the XML tab to be clickable or generated
    const xmlTab = page.getByRole('button', { name: /pacs\.008 XML/i });
    await expect(xmlTab).toBeVisible();
    await xmlTab.click();

    // Verify XML schema tags rendered in output
    const xmlPre = page.locator('pre:has-text("pacs.008")');
    await expect(xmlPre).toBeVisible({ timeout: 15000 });
    await expect(xmlPre).toContainText('FIToFICstmrCdtTrf');
  });
});
