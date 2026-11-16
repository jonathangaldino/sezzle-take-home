export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage'

export interface CalculationRequest {
  operation: Operation
  operands: number[]
}

export interface CalculationResponse {
  operation: Operation
  operands: number[]
  result: number
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

/**
 * - `network`: the request never got a response (offline, DNS, CORS, server down).
 * - `api`: the backend answered with its documented error body.
 * - `unexpected`: a response we cannot interpret (e.g. a proxy's HTML 502).
 */
export type ApiErrorKind = 'network' | 'api' | 'unexpected'

export class CalculatorApiError extends Error {
  readonly kind: ApiErrorKind
  readonly code: string | undefined
  readonly status: number | undefined

  constructor(kind: ApiErrorKind, message: string, options: { code?: string; status?: number } = {}) {
    super(message)
    this.name = 'CalculatorApiError'
    this.kind = kind
    this.code = options.code
    this.status = options.status
  }
}

const CALCULATIONS_PATH = '/api/v1/calculations'
const UNREACHABLE_MESSAGE = 'Could not reach the calculator service. Check your connection and try again.'

function apiBaseUrl(): string {
  // Empty means same origin (the Vite dev server proxies /api to the backend).
  return (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  )
}

function isCalculationResponse(value: unknown): value is CalculationResponse {
  return (
    isRecord(value) &&
    typeof value.operation === 'string' &&
    Array.isArray(value.operands) &&
    value.operands.every((operand) => typeof operand === 'number') &&
    typeof value.result === 'number'
  )
}

export async function calculate(
  request: CalculationRequest,
  signal?: AbortSignal,
): Promise<CalculationResponse> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${CALCULATIONS_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
      signal,
    })
  } catch (error) {
    // Callers abort on purpose; let them recognise their own cancellation.
    if (signal?.aborted) throw error
    throw new CalculatorApiError('network', UNREACHABLE_MESSAGE)
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }

  if (!response.ok) {
    if (isApiErrorBody(body)) {
      throw new CalculatorApiError('api', body.error.message, {
        code: body.error.code,
        status: response.status,
      })
    }
    // A proxy in front of the API (e.g. the Vite dev server) answers 502-504 when the backend is down.
    if (response.status >= 502 && response.status <= 504) {
      throw new CalculatorApiError('network', UNREACHABLE_MESSAGE, { status: response.status })
    }
    throw new CalculatorApiError(
      'unexpected',
      `The calculator service returned an unexpected response (HTTP ${response.status}).`,
      { status: response.status },
    )
  }

  if (!isCalculationResponse(body)) {
    throw new CalculatorApiError(
      'unexpected',
      'The calculator service returned a response that could not be read.',
      { status: response.status },
    )
  }
  return body
}
