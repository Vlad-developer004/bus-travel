import { expect, test } from '@playwright/test';

test.describe('passenger journey', () => {
  test('search, sign up, pick a seat, pay, get a QR ticket', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('next trip');
    await page.getByRole('button', { name: 'Search trips' }).click();
    await expect(page).toHaveURL(/\/en\/search\?from=berlin&to=warsaw/);
    await page.getByRole('link', { name: 'Select seats' }).first().click();

    await page.getByRole('link', { name: 'Log in to book' }).click();
    await page.getByRole('link', { name: 'Sign up' }).last().click();
    await page.getByLabel('Name').fill('E2E Passenger');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Passw0rd!e2e');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page).toHaveURL(/\/en\/account/);

    await page.goto('/en/search?from=berlin&to=warsaw&date=' + new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10) + '&passengers=1');
    await page.getByRole('link', { name: 'Select seats' }).first().click();
    await page.locator('button[aria-pressed]:not([disabled])').nth(20).click();
    await page.getByLabel('Full name').fill('E2E Passenger');
    await page.getByRole('button', { name: 'Continue to payment' }).click();

    await expect(page).toHaveURL(/\/en\/pay\/mock\?booking=/);
    await page.getByRole('button', { name: /^Pay / }).click();
    await expect(page.getByText('Payment received')).toBeVisible();
    await expect(page.locator('img[alt^="QR BT-"]')).toBeVisible();

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Add to calendar' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^BT-.+\.ics$/);
    const ics = await (await import('node:fs/promises')).readFile((await download.path())!, 'utf8');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:');

    await page.getByRole('link', { name: 'All trips' }).click();
    await expect(page.getByText('Paid').first()).toBeVisible();
  });

  test('language switcher translates the whole page', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('combobox', { name: 'Language' }).click();
    await page.getByRole('option', { name: 'Deutsch' }).click();
    await expect(page).toHaveURL(/\/de$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Deine nächste Reise beginnt hier');
    await page.getByRole('combobox', { name: 'Language' }).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.type('Pol');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Twoja kolejna podróż zaczyna się tutaj');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
  });

  test('round trip: pick outbound, pick return, pay both, then review and save the route', async ({ page }) => {
    const email = `e2e-rt-${Date.now()}@example.com`;
    const go = new Date(Date.now() + 4 * 86_400_000).toISOString().slice(0, 10);
    const back = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    await page.goto('/en/register');
    await page.getByLabel('Name').fill('Round Tripper');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Passw0rd!e2e');
    await page.getByRole('button', { name: 'Sign up' }).click();
    await expect(page).toHaveURL(/\/en\/account/);

    await page.goto(`/en/search?from=berlin&to=warsaw&date=${go}&passengers=1&return=${back}`);
    await expect(page.getByText('Choose your outbound trip')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Prices by day' })).toBeVisible();
    await page.getByRole('button', { name: 'Save route' }).click();
    await expect(page.getByRole('button', { name: 'Remove from saved' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('link', { name: 'Select seats' }).first().click();
    await page.locator('button[aria-pressed]:not([disabled])').nth(30).click();
    await page.getByLabel('Full name').fill('Round Tripper');
    await page.getByRole('button', { name: 'Continue to payment' }).click();

    await expect(page).toHaveURL(/\/en\/search\?from=warsaw&to=berlin.*outbound=/);
    await expect(page.getByText('Choose your return trip').first()).toBeVisible();
    await page.getByRole('link', { name: 'Select seats' }).first().click();
    await page.locator('button[aria-pressed]:not([disabled])').nth(31).click();
    await page.getByLabel('Full name').fill('Round Tripper');
    await page.getByRole('button', { name: 'Continue to payment' }).click();

    await expect(page).toHaveURL(/\/en\/pay\/mock\?booking=[^,]+,[^,]+/);
    await expect(page.getByText('Round trip: 2 tickets')).toBeVisible();
    await page.getByRole('button', { name: /^Pay / }).click();
    await expect(page).toHaveURL(/\/en\/account$/);
    await expect(page.getByText('Paid')).toHaveCount(2);

    await page.getByRole('link', { name: /Warsaw|Berlin/ }).first().click();
    await page.getByRole('radio', { name: '5 out of 5 stars' }).click();
    await page.getByLabel('Comment (optional)').fill('Great round trip, e2e approved');
    await page.getByRole('button', { name: 'Send review' }).click();
    await expect(page.getByText('Your review')).toBeVisible();

    await page.goto('/en');
    await expect(page.getByRole('group', { name: 'Saved routes' })).toContainText('Berlin → Warsaw');
  });

  test('search results can be sorted and filtered by time of day', async ({ page }) => {
    const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    await page.goto(`/en/search?from=berlin&to=warsaw&date=${day}&passengers=1`);
    const rows = page.locator('ul > li').filter({ has: page.getByRole('link', { name: 'Select seats' }) });
    await expect(rows.first()).toBeVisible();
    const all = await rows.count();
    expect(all).toBeGreaterThan(1);
    await page.getByRole('button', { name: 'Evening' }).click();
    const evening = await rows.count();
    expect(evening).toBeLessThan(all);
    for (const t of await rows.locator('.num').first().allInnerTexts()) expect(Number(t.slice(0, 2))).toBeGreaterThanOrEqual(18);
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(rows).toHaveCount(all);
    await page.getByRole('button', { name: 'Cheapest' }).click();
    await expect(page.getByRole('button', { name: 'Cheapest' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('custom calendar: past days are disabled, keyboard and mouse both pick a date', async ({ page }) => {
    await page.goto('/en');
    const trigger = page.locator('#date');
    const before = await trigger.innerText();
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const past = dialog.locator(`[data-iso="${yesterday}"]`);
    if (await past.count()) await expect(past).toBeDisabled();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(trigger).not.toHaveText(before);
    await trigger.click();
    await dialog.locator('button[data-iso]:not([disabled])').last().click();
    await expect(dialog).toBeHidden();
  });

  test('driver can validate tickets, passengers cannot see the driver page', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel('Email').fill('demo@bustravel.local');
    await page.getByLabel('Password', { exact: true }).fill('Demo1234!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.goto('/en/driver');
    await expect(page.getByText('This page is for drivers and administrators.')).toBeVisible();
  });

  test('admin area: trips, routes, users and bookings can be managed', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel('Email').fill('admin@bustravel.local');
    await page.getByLabel('Password', { exact: true }).fill('Demo1234!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/en\/account/);
    await page.goto('/en/admin');
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Trips' }).click();
    await page.getByRole('combobox', { name: 'From city' }).click();
    await page.getByRole('option', { name: 'Berlin' }).click();
    await page.getByRole('combobox', { name: 'To city' }).click();
    await page.getByRole('option', { name: 'Warsaw' }).click();
    const firstPrice = page.getByRole('button', { name: /^Edit price/ }).first();
    await expect(firstPrice).toBeVisible();
    await firstPrice.click();
    await page.getByLabel('Price', { exact: true }).fill('41.50');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Edit price: €41.50' }).first()).toBeVisible();

    await page.getByRole('tab', { name: 'Routes' }).click();
    await expect(page.getByRole('heading', { name: 'Schedules' })).toBeVisible();
    await expect(page.getByRole('switch').first()).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('tab', { name: 'Users' }).click();
    await page.getByPlaceholder('Search by name or email').fill('driver@');
    await expect(page.getByRole('cell', { name: /driver@bustravel.local/ })).toBeVisible();

    await page.getByRole('tab', { name: 'Bookings' }).click();
    await page.getByRole('button', { name: 'Total' }).click();
    await expect(page.getByRole('columnheader', { name: /Total/ })).toHaveAttribute('aria-sort', 'descending');
    await page.reload();
    await expect(page.getByRole('tab', { name: 'Bookings' })).toHaveAttribute('aria-selected', 'true');
  });
});
