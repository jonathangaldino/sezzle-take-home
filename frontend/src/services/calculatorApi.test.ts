import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculate, CalculatorApiError } from './calculatorApi'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function captureError(promise: Promise<unknown>): Promise<CalculatorApiError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  )
  if (!(error instanceof CalculatorApiError)) throw new Error(`Expected CalculatorApiError, got ${String(error)}`)
  return error
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('calculate', () => {
  it('POSTs the request as JSON and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ operation: 'add', operands: [10, 5], result: 15 }))

    const response = await calculate({ operation: 'add', operands: [10, 5] })

    expect(response).toEqual({ operation: 'add', operands: [10, 5], result: 15 })
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/calculations')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"operation":"add","operands":[10,5]}')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  })

  it('prefixes the configured base URL, ignoring a trailing slash', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    fetchMock.mockResolvedValue(jsonResponse({ operation: 'sqrt', operands: [9], result: 3 }))

    await calculate({ operation: 'sqrt', operands: [9] })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.example.com/api/v1/calculations')
  })

  it('passes the abort signal through to fetch', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ operation: 'add', operands: [1, 2], result: 3 }))
    const controller = new AbortController()

    await calculate({ operation: 'add', operands: [1, 2] }, controller.signal)

    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })

  it('surfaces the backend error code and message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero' } }, 422),
    )

    const error = await captureError(calculate({ operation: 'divide', operands: [1, 0] }))

    expect(error.kind).toBe('api')
    expect(error.code).toBe('DIVISION_BY_ZERO')
    expect(error.status).toBe(422)
    expect(error.message).toBe('Cannot divide by zero')
  })

  it('reports a network failure when fetch rejects', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const error = await captureError(calculate({ operation: 'add', operands: [1, 2] }))

    expect(error.kind).toBe('network')
    expect(error.message).toMatch(/could not reach/i)
  })

  it('rethrows the original error when the caller aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const abortError = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValue(abortError)

    await expect(calculate({ operation: 'add', operands: [1, 2] }, controller.signal)).rejects.toBe(abortError)
  })

  it('reports an unexpected response for a non-JSON error page', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))

    const error = await captureError(calculate({ operation: 'add', operands: [1, 2] }))

    expect(error.kind).toBe('unexpected')
    expect(error.status).toBe(502)
    expect(error.message).toMatch(/HTTP 502/)
  })

  it('reports an unexpected response for JSON errors without the documented shape', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nope' }, 500))

    const error = await captureError(calculate({ operation: 'add', operands: [1, 2] }))

    expect(error.kind).toBe('unexpected')
    expect(error.code).toBeUndefined()
  })

  it('reports an unexpected response when a 200 body is malformed', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ result: 'fifteen' }))

    const error = await captureError(calculate({ operation: 'add', operands: [10, 5] }))

    expect(error.kind).toBe('unexpected')
  })
})
