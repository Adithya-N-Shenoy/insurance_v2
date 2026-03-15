import { NextRequest, NextResponse } from 'next/server';
import {
  findClaimByIdentifier,
  createStatusHistory,
  hydrateClaim,
  updateClaim,
} from '@/lib/firebase/repository';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log('Looking up claim with identifier:', id);
    const claim = await findClaimByIdentifier(id);
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      claim: await hydrateClaim(claim)
    });

  } catch (error: any) {
    console.error('Claim API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;

    const existingClaim = await findClaimByIdentifier(id);
    if (!existingClaim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    await updateClaim(existingClaim.id, {
      ...body,
      updated_at: new Date().toISOString()
    });

    // Create status history if status changed
    if (body.status) {
      await createStatusHistory({
        claim_id: existingClaim.id,
        status: body.status,
        notes: body.statusNotes || `Status updated to ${body.status}`,
        created_at: new Date().toISOString()
      });
    }

    const claim = await findClaimByIdentifier(existingClaim.id);

    return NextResponse.json({
      success: true,
      claim: await hydrateClaim(claim)
    });

  } catch (error: any) {
    console.error('Claim API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
