import { NextRequest, NextResponse } from 'next/server';
import {
  createDocumentRequests,
  createOrUpdateAgentByEmail,
  createReviewNote,
  createStatusHistory,
  findClaimByIdentifier,
  listClaimItemsByClaimId,
  updateClaim,
  updateClaimItem,
} from '@/lib/firebase/repository';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    console.log('Review API received:', body);

    const { 
      agentName, 
      agentEmail, 
      agentPhone, 
      reviewNotes, 
      items,
      action,
      documentRequests,
      companyId,
      statusNotes
    } = body;

    // Validate that action is present
    if (!action) {
      console.error('No action provided in request body');
      return NextResponse.json(
        { error: 'No action specified. Please select approve, reject, or partial.' },
        { status: 400 }
      );
    }

    console.log('Processing review with action:', action);

    const claim = await findClaimByIdentifier(params.id);
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    const claimId = claim.id;

    // First, create or get agent with all credentials
    let agentId = null;
    if (agentEmail) {
      const agent = await createOrUpdateAgentByEmail({
        company_id: companyId,
        email: agentEmail,
        name: agentName,
        phone: agentPhone,
      });
      agentId = agent.id;
    }

    // Handle document requests first (if any)
    if (documentRequests && documentRequests.length > 0) {
      const timestamp = new Date().toISOString();
      await createDocumentRequests(
        documentRequests.map((docRequest: any) => ({
          claim_id: claimId,
          requested_by: agentId,
          document_type: docRequest.documentType,
          description: docRequest.description,
          status: 'pending',
          submitted_url: null,
          submitted_at: null,
          created_at: timestamp,
          updated_at: timestamp,
        }))
      );

      // If this is just a document request (no approval/rejection yet)
      if (action === 'request_documents') {
        await updateClaim(claimId, {
          status: 'documents_requested',
          agent_id: agentId,
          updated_at: new Date().toISOString()
        });

        // Add status history
        await createStatusHistory({
          claim_id: claimId,
          status: 'documents_requested',
          notes: `Additional documents requested by ${agentName}`,
          created_at: new Date().toISOString()
        });

        // Add review notes
        if (reviewNotes) {
          await createReviewNote({
            claim_id: claimId,
            agent_id: agentId,
            notes: reviewNotes,
            is_private: false,
            created_at: new Date().toISOString()
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Document requests sent successfully',
          status: 'documents_requested'
        });
      }
    }

    // Update claim items with approved/rejected amounts
    if (items && items.length > 0) {
      for (const item of items) {
        await updateClaimItem(item.id, {
          approved_amount: item.approved_amount,
          rejected_amount: item.rejected_amount,
          rejection_reason: item.rejection_reason,
          status: item.status,
          updated_at: new Date().toISOString()
        });
      }
    }

    // Calculate totals
    const updatedItems = await listClaimItemsByClaimId(claimId);

    const totalApproved = updatedItems?.reduce((sum, item) => sum + (item.approved_amount || 0), 0) || 0;
    const totalRejected = updatedItems?.reduce((sum, item) => sum + (item.rejected_amount || 0), 0) || 0;

    // Determine final status based on action
    let finalStatus = body.status || 'under_review';
    if (action === 'approve') {
      finalStatus = 'approved';
    } else if (action === 'reject') {
      finalStatus = 'rejected';
    } else if (action === 'partial') {
      finalStatus = 'partial';
    } else if (action === 'complete') {
      finalStatus = 'completed';
    } else if (action === 'save') {
      finalStatus = 'under_review';
    }

    console.log(`Setting claim status to: ${finalStatus} based on action: ${action}`);

    // Update claim with all data
    const claimUpdateData = {
      status: finalStatus,
      agent_id: agentId,
      total_approved_amount: totalApproved,
      total_rejected_amount: totalRejected,
      reviewed_at: new Date().toISOString(),
      completed_at: ['approved', 'rejected', 'completed'].includes(finalStatus) ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    };

    console.log('Updating claim with:', claimUpdateData);

    await updateClaim(claimId, claimUpdateData);

    // Add review notes
    if (reviewNotes) {
      await createReviewNote({
        claim_id: claimId,
        agent_id: agentId,
        notes: reviewNotes,
        is_private: false,
        created_at: new Date().toISOString()
      });
    }

    // Add status history
    await createStatusHistory({
      claim_id: claimId,
      status: finalStatus,
      notes: statusNotes || `Claim ${finalStatus} by ${agentName}`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Claim ${finalStatus} successfully`,
      status: finalStatus
    });

  } catch (error: any) {
    console.error('Review API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
