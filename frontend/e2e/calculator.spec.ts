import { expect, test, type Page } from '@playwright/test'

const CALCULATIONS = '**/api/v1/calculations'

async function selectOperation(page: Page, label: string) {
  await page.getByLabel('Operation').selectOption({ label })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('shows the result computed by the backend', async ({ page }) => {
  await selectOperation(page, 'Multiply (×)')
  await page.getByLabel('First number', { exact: true }).fill('12')
  await page.getByLabel('Second number', { exact: true }).fill('3.5')

  const response = page.waitForResponse(CALCULATIONS)
  await page.getByRole('button', { name: 'Calculate' }).click()
  expect(await (await response).json()).toEqual({ operation: 'multiply', operands: [12, 3.5], result: 42 })

  const result = page.getByRole('region', { name: 'Result' })
  await expect(result).toContainText('12 × 3.5 =')
  await expect(result.getByText('42', { exact: true })).toBeVisible()
})

test('square root uses a single operand', async ({ page }) => {
  await selectOperation(page, 'Square root (√)')
  await expect(page.getByRole('textbox')).toHaveCount(1)
  await page.getByLabel('Number', { exact: true }).fill('16')
  await page.getByRole('button', { name: 'Calculate' }).click()

  const result = page.getByRole('region', { name: 'Result' })
  await expect(result).toContainText('√16 =')
  await expect(result.getByText('4', { exact: true })).toBeVisible()
})

test('percentage is b% of a', async ({ page }) => {
  await selectOperation(page, 'Percentage (%)')
  await page.getByLabel('Value', { exact: true }).fill('200')
  await page.getByLabel('Percent', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Calculate' }).click()

  const result = page.getByRole('region', { name: 'Result' })
  await expect(result).toContainText('10% of 200 =')
  await expect(result.getByText('20', { exact: true })).toBeVisible()
})

test('division by zero shows the backend error message', async ({ page }) => {
  await selectOperation(page, 'Divide (÷)')
  await page.getByLabel('Dividend', { exact: true }).fill('10')
  await page.getByLabel('Divisor', { exact: true }).fill('0')

  const response = page.waitForResponse(CALCULATIONS)
  await page.getByRole('button', { name: 'Calculate' }).click()
  expect((await response).status()).toBe(422)

  await expect(page.getByRole('alert')).toHaveText('Cannot divide by zero')
})

test('invalid input is rejected without calling the API', async ({ page }) => {
  let requests = 0
  page.on('request', (request) => {
    if (request.url().includes('/api/')) requests++
  })

  const first = page.getByLabel('First number', { exact: true })
  await first.fill('abc')
  await page.getByLabel('Second number', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Calculate' }).click()

  await expect(page.getByText('Enter a valid number, like 42 or -3.5.')).toBeVisible()
  await expect(first).toHaveAttribute('aria-invalid', 'true')
  await expect(first).toBeFocused()
  expect(requests).toBe(0)
})

test('the displayed result hides float64 noise from the backend', async ({ page }) => {
  await page.getByLabel('First number', { exact: true }).fill('0.1')
  await page.getByLabel('Second number', { exact: true }).fill('0.2')

  const response = page.waitForResponse(CALCULATIONS)
  await page.getByRole('button', { name: 'Calculate' }).click()
  expect((await (await response).json()).result).toBe(0.30000000000000004)

  const result = page.getByRole('region', { name: 'Result' })
  await expect(result.getByText('0.3', { exact: true })).toBeVisible()
})

test('Clear resets the form', async ({ page }) => {
  await selectOperation(page, 'Divide (÷)')
  await page.getByLabel('Dividend', { exact: true }).fill('9')
  await page.getByLabel('Divisor', { exact: true }).fill('3')
  await page.getByRole('button', { name: 'Calculate' }).click()
  const result = page.getByRole('region', { name: 'Result' })
  await expect(result.getByText('3', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Clear' }).click()

  await expect(page.getByLabel('Operation')).toHaveValue('add')
  await expect(page.getByLabel('First number', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Second number', { exact: true })).toHaveValue('')
  await expect(result).toHaveText('Enter values and press Calculate.')
})

test.describe('on a 375 px wide screen', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('the form works and the page does not scroll horizontally', async ({ page }) => {
    await page.getByLabel('First number', { exact: true }).fill('7')
    await page.getByLabel('Second number', { exact: true }).fill('5')
    await page.getByRole('button', { name: 'Calculate' }).click()
    await expect(page.getByRole('region', { name: 'Result' }).getByText('12', { exact: true })).toBeVisible()

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBe(0)
  })
})
