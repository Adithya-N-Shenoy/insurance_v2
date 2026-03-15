import { NextRequest, NextResponse } from 'next/server';
import {
  createStatusHistory,
  findClaimByIdentifier,
  getDocumentRequestForClaim,
  listDocumentRequestsByClaimId,
  updateDocumentRequest,
  uploadBuffer,
} from '@/lib/firebase/repository';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const requestId = formData.get('requestId') as string;

    if (!file || !requestId) {
      return NextResponse.json(
        { error: 'Missing file or requestId' },
        { status: 400 }
      );
    }

    const claim = await findClaimByIdentifier(params.id);
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }
    const claimId = claim.id;

    // First, check if document request exists
    const existingRequest = await getDocumentRequestForClaim(requestId, claimId);
    if (!existingRequest) {
      return NextResponse.json(
        { error: 'Document request not found' },
        { status: 404 }
      );
    }

    // Upload file to Firebase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `documents/${claimId}/${fileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`Uploading document to storage: ${filePath}`);

    const uploadData = await uploadBuffer({
      buffer,
      contentType: file.type,
      destination: filePath,
    });

    console.log('Document uploaded, public URL:', uploadData.publicUrl);

    // Update document request with comprehensive data
    const updateData = {
      status: 'submitted',
      submitted_url: uploadData.publicUrl,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: filePath
    };

    console.log('Updating document request with:', updateData);

    const verifiedRequest = await updateDocumentRequest(requestId, updateData);
    console.log('Document request updated successfully:', verifiedRequest);

    // Add status history
    await createStatusHistory({
      claim_id: claimId,
      status: 'documents_submitted',
      notes: `Patient submitted document: ${file.name}`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        id: requestId,
        url: uploadData.publicUrl,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Document upload error:', error);
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
    const claim = await findClaimByIdentifier(params.id);
    if (!claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      documents: await listDocumentRequestsByClaimId(claim.id)
    });

  } catch (error: any) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
