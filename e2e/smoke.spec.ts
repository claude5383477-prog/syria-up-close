import { expect, test } from '@playwright/test'

test('english home renders ltr', async ({ page }) => {
  await page.goto('/en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})
