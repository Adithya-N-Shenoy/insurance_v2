import { NextRequest, NextResponse } from 'next/server';
import { geminiClient, type ClaimSummaryInput } from '@/lib/gemini/client';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const claimData = body?.claimData as ClaimSummaryInput | undefined;

    if (!claimData) {
      return NextResponse.json(
        { error: 'claimData is required.' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    const summary = await geminiClient.generateClaimSummary({
      claimData,
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to generate claim summary' },
      { status: 500 }
    );
  }
}
