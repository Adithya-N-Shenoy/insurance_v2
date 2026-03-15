import { NextRequest, NextResponse } from 'next/server';
import {
  createStatusHistory,
  findClaimByIdentifier,
  getDocumentRequestForClaim,
  updateDocumentRequest,
} from '@/lib/firebase/repository';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const body = await request.json();
    const claim = await findClaimByIdentifier(params.id);
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }
    const claimId = claim.id;

    // First check if document exists
    const existingDoc = await getDocumentRequestForClaim(params.documentId, claimId);
    if (!existingDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Update document request status
    const updateData = {
      status: body.status,
      updated_at: new Date().toISOString(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: body.agentId || null,
      review_notes: body.notes || null
    };

    await updateDocumentRequest(params.documentId, updateData);

    // Add status history
    await createStatusHistory({
      claim_id: claimId,
      status: `document_${body.status}`,
      notes: body.notes || `Document ${body.status} by agent`,
      created_at: new Date().toISOString()
    });

    // Get updated document
    const updatedDoc = await getDocumentRequestForClaim(params.documentId, claimId);

    return NextResponse.json({
      success: true,
      message: `Document ${body.status} successfully`,
      document: updatedDoc
    });

  } catch (error: any) {
    console.error('Document update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const claim = await findClaimByIdentifier(params.id);
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    const document = await getDocumentRequestForClaim(params.documentId, claim.id);
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document
    });

  } catch (error: any) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
