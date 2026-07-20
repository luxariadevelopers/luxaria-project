import { ERROR_CODES } from './error';
import {
  buildFieldErrors,
  getUserErrorMessage,
  inferFieldFromDetailMessage,
  normalizeAppError,
  sanitizeErrorMessage,
} from './normalize-error';

function apiBody(
  overrides: Partial<{
    errorCode: string;
    message: string;
    details: { field?: string; message: string }[];
    requestId: string;
    timestamp: string;
  }> = {},
) {
  return {
    success: false as const,
    errorCode: overrides.errorCode ?? ERROR_CODES.BAD_REQUEST,
    message: overrides.message ?? 'Validation failed',
    details: overrides.details ?? [],
    requestId: overrides.requestId ?? 'req-1',
    timestamp: overrides.timestamp ?? '2026-07-20T00:00:00.000Z',
  };
}

describe('normalizeAppError', () => {
  it('handles 400 bad request with field details', () => {
    const err = normalizeAppError({
      status: 400,
      body: apiBody({
        errorCode: ERROR_CODES.BAD_REQUEST,
        message: 'Validation failed',
        details: [
          { message: 'email must be an email' },
          { field: 'password', message: 'password should not be empty' },
        ],
      }),
    });
    expect(err.kind).toBe('bad_request');
    expect(err.httpStatus).toBe(400);
    expect(err.fieldErrors.email).toBe('email must be an email');
    expect(err.fieldErrors.password).toBe('password should not be empty');
    expect(err.retryable).toBe(false);
    expect(err.requestId).toBe('req-1');
  });

  it('handles 401 unauthorized', () => {
    const err = normalizeAppError({
      status: 401,
      body: apiBody({
        errorCode: ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid credentials',
      }),
    });
    expect(err.kind).toBe('unauthorized');
    expect(err.title).toBe('Sign in required');
    expect(err.message).toBe('Invalid credentials');
    expect(err.retryable).toBe(false);
  });

  it('handles 403 forbidden / project access', () => {
    const err = normalizeAppError({
      status: 403,
      body: apiBody({
        errorCode: ERROR_CODES.FORBIDDEN,
        message: 'Project access denied',
      }),
    });
    expect(err.kind).toBe('forbidden');
    expect(err.title).toBe('Access denied');
    expect(err.message).toBe('Project access denied');
  });

  it('handles 404 not found', () => {
    const err = normalizeAppError({
      status: 404,
      body: apiBody({
        errorCode: ERROR_CODES.NOT_FOUND,
        message: 'DPR not found',
      }),
    });
    expect(err.kind).toBe('not_found');
    expect(err.retryable).toBe(false);
  });

  it('handles 409 conflict', () => {
    const err = normalizeAppError({
      status: 409,
      body: apiBody({
        errorCode: ERROR_CODES.CONFLICT,
        message: 'Already posted',
      }),
    });
    expect(err.kind).toBe('conflict');
    expect(err.retryable).toBe(false);
  });

  it('handles 422 validation', () => {
    const err = normalizeAppError({
      status: 422,
      body: apiBody({
        errorCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Unprocessable',
        details: [{ field: 'amount', message: 'Amount must be ≥ 0' }],
      }),
    });
    expect(err.kind).toBe('validation');
    expect(err.fieldErrors.amount).toBe('Amount must be ≥ 0');
  });

  it('handles 500 server errors as retryable', () => {
    const err = normalizeAppError({
      status: 500,
      body: apiBody({
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        message: 'Unexpected failure',
      }),
    });
    expect(err.kind).toBe('server');
    expect(err.retryable).toBe(true);
  });

  it('handles network failures as retryable', () => {
    const err = normalizeAppError({
      isNetworkError: true,
      message: 'Network Error',
    });
    expect(err.kind).toBe('network');
    expect(err.retryable).toBe(true);
    expect(err.message).toMatch(/connection/i);
  });

  it('maps axios-shaped objects without importing axios', () => {
    const err = normalizeAppError({
      isAxiosError: true,
      message: 'Request failed with status code 403',
      response: {
        status: 403,
        data: apiBody({
          errorCode: ERROR_CODES.FORBIDDEN,
          message: 'Missing permission dpr.view',
        }),
      },
    });
    expect(err.kind).toBe('forbidden');
    expect(err.message).toBe('Missing permission dpr.view');
  });

  it('never exposes stack traces or bearer tokens', () => {
    const stack = normalizeAppError(
      new Error('TypeError: boom\n    at Object.<anonymous> (app.js:1:1)'),
    );
    expect(stack.message).toBe('Something went wrong');
    expect(stack.message).not.toMatch(/at Object/);

    const token = sanitizeErrorMessage(
      'Unauthorized Bearer eyJhbGciOiJIUzI1NiJ9.aaa.bbb',
    );
    expect(token).toContain('[redacted]');
    expect(token).not.toMatch(/eyJ/);
  });
});

describe('field helpers', () => {
  it('infers field names from class-validator messages', () => {
    expect(inferFieldFromDetailMessage('email must be an email')).toBe('email');
    expect(inferFieldFromDetailMessage('lines.0.qty should not be empty')).toBe(
      'lines.0.qty',
    );
  });

  it('buildFieldErrors prefers explicit field', () => {
    expect(
      buildFieldErrors([
        { field: 'gstin', message: 'Invalid GSTIN' },
        { message: 'email must be an email' },
      ]),
    ).toEqual({
      gstin: 'Invalid GSTIN',
      email: 'email must be an email',
    });
  });

  it('getUserErrorMessage returns sanitized text', () => {
    expect(
      getUserErrorMessage({
        status: 404,
        body: apiBody({
          errorCode: ERROR_CODES.NOT_FOUND,
          message: 'Missing',
        }),
      }),
    ).toBe('Missing');
  });
});
