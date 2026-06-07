/**
 * withProLicense - wraps a Next.js Route Handler and returns 403 when no
 * valid Pro license is present in the environment.
 *
 * Usage:
 *   export const POST = withProLicense(async (req) => { ... });
 *   export const GET  = withProLicense(async (req, ctx) => { ... });
 */

import { type NextRequest, NextResponse } from 'next/server';
import { hasValidLicense } from '@/lib/license';

type RouteContext = { params?: Record<string, string | string[]> };
type Handler = (req: NextRequest, ctx: RouteContext) => Promise<NextResponse> | NextResponse;

export function withProLicense(handler: Handler): Handler {
  return async (req: NextRequest, ctx: RouteContext) => {
    if (!(await hasValidLicense())) {
      return NextResponse.json(
        {
          error: 'pro_license_required',
          message:
            'This endpoint requires a valid CyberRisk Canvas Pro license. ' +
            'Configure a license key in the admin panel.',
        },
        { status: 403 },
      );
    }
    return handler(req, ctx);
  };
}

/**
 * requireProLicense - for use inside Server Actions.
 * Throws a descriptive error instead of returning an HTTP response.
 */
export async function requireProLicense(): Promise<void> {
  if (!(await hasValidLicense())) {
    throw new Error(
      'Pro license required. Configure a license key in the admin panel to unlock this feature.',
    );
  }
}
