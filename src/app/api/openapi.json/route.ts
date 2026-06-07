import { NextResponse } from 'next/server';
import SPEC from '@/lib/openapi';

export const dynamic = 'force-static';

export function GET() {
  return NextResponse.json(SPEC, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
