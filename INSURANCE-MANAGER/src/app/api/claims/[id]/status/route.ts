import { NextRequest, NextResponse } from 'next/server';
import {
  createStatusHistory,
  findClaimByIdentifier,
  listStatusHistoryByClaimId,
  updateClaim,
} from '@/lib/firebase/repository';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { id } = params;
    const { status, notes, agentId } = body;

    const claim = await findClaimByIdentifier(id);
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    await updateClaim(claim.id, {
      status,
      updated_at: new Date().toISOString()
    });

    await createStatusHistory({
      claim_id: claim.id,
      status,
      notes: notes || `Status updated to ${status}`,
      changed_by: agentId,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Claim status updated to ${status}`
    });

  } catch (error: any) {
    console.error('Status update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const claim = await findClaimByIdentifier(id);
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      history: await listStatusHistoryByClaimId(claim.id)
    });

  } catch (error: any) {
    console.error('Status fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
