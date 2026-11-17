import { expect, test, type Page } from '@playwright/test'

const CALCULATIONS = '**/api/v1/calculations'

/** Clicks keypad keys by accessible name, e.g. press(page, '1', '2', 'Add'). */
async function press(page: Page, ...names: string[]) {
  for (const name of names) await page.getByRole('button', { name, exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('shows the result computed by the backend', async ({ page }) => {
  await press(page, '1', '2', 'Multiply', '3', 'Decimal point', '5')

  const response = page.waitForResponse(CALCULATIONS)
  await press(page, 'Equals')
  expect(await (await response).json()).toEqual({ operation: 'multiply', operands: [12, 3.5], result: 42 })

  const result = page.getByRole('region', { name: 'Result' })
  await expect(result).toContainText('12 × 3.5 =')
  await expect(page.getByRole('status')).toHaveText('42')
})

test('chains operations left to right', async ({ page }) => {
  await press(page, '2', 'Add', '3', 'Multiply', '4', 'Equals')
  await expect(page.getByRole('status')).toHaveText('20')
})

test('square root applies to the displayed number', async ({ page }) => {
  await press(page, '1', '6', 'Square root')

  await expect(page.getByRole('region', { name: 'Result' })).toContainText('√16 =')
  await expect(page.getByRole('status')).toHaveText('4')
})

test('percentage is b% of a', async ({ page }) => {
  await press(page, '2', '0', '0', 'Percentage', '1', '0', 'Equals')

  await expect(page.getByRole('region', { name: 'Result' })).toContainText('10% of 200 =')
  await expect(page.getByRole('status')).toHaveText('20')
})

test('division by zero shows the backend error message', async ({ page }) => {
  await press(page, '1', '0', 'Divide', '0')

  const response = page.waitForResponse(CALCULATIONS)
  await press(page, 'Equals')
  expect((await response).status()).toBe(422)

  await expect(page.getByRole('alert')).toHaveText('Cannot divide by zero')
})

test('the displayed result hides float64 noise from the backend', async ({ page }) => {
  await press(page, 'Decimal point', '1', 'Add', 'Decimal point', '2')

  const response = page.waitForResponse(CALCULATIONS)
  await press(page, 'Equals')
  expect((await (await response).json()).result).toBe(0.30000000000000004)

  await expect(page.getByRole('status')).toHaveText('0.3')
})

test('works from the keyboard', async ({ page }) => {
  // Keys sent before React mounts would go nowhere.
  await expect(page.getByRole('status')).toHaveText('0')
  await page.keyboard.type('9-4')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toHaveText('5')

  await page.keyboard.press('Escape')
  await expect(page.getByRole('status')).toHaveText('0')
  await expect(page.getByRole('region', { name: 'Result' })).not.toContainText('=')
})

test.describe('on a 375 px wide screen', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('the keypad works and the page does not scroll horizontally', async ({ page }) => {
    await press(page, '7', 'Add', '5', 'Equals')
    await expect(page.getByRole('status')).toHaveText('12')

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})
