import { NextRequest, NextResponse } from 'next/server';
import {
  createClaim,
  createClaimItems,
  createNotification,
  createStatusHistory,
  findCompanyByIdentifier,
  hydrateClaim,
  listClaims,
} from '@/lib/firebase/repository';

export const maxDuration = 30; // Maximum duration in seconds
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Received claim data:', body);

    // Validate required fields
    const requiredFields = [
      'companyId', 'patientName', 'patientDob', 'patientGender',
      'patientPhone', 'policyNumber', 'admissionDate', 'admissionType',
      'staffName', 'staffDesignation', 'staffPhone', 'staffEmail'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // First, get the actual UUID for the insurance company
    const company = await findCompanyByIdentifier(body.companyId);
    if (!company) {
      return NextResponse.json(
        { error: `Insurance company not found: ${body.companyId}` },
        { status: 404 }
      );
    }
    body.companyId = company.id;

    // Generate claim number
    const claimNumber = `CLM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    // Calculate length of stay if discharge date provided
    let lengthOfStay = null;
    if (body.dischargeDate && body.admissionDate) {
      const admission = new Date(body.admissionDate);
      const discharge = new Date(body.dischargeDate);
      lengthOfStay = Math.ceil((discharge.getTime() - admission.getTime()) / (1000 * 60 * 60 * 24));
    }

    console.log('Inserting claim with companyId:', body.companyId);

    // Insert claim
    const timestamp = new Date().toISOString();
    const claim = await createClaim({
        claim_number: claimNumber,
        company_id: body.companyId,
        status: 'submitted',
        patient_name: body.patientName,
        patient_dob: body.patientDob,
        patient_gender: body.patientGender,
        patient_phone: body.patientPhone,
        patient_email: body.patientEmail,
        policy_number: body.policyNumber,
        patient_address: body.patientAddress,
        admission_date: body.admissionDate,
        discharge_date: body.dischargeDate,
        admission_type: body.admissionType,
        length_of_stay: lengthOfStay,
        staff_name: body.staffName,
        staff_designation: body.staffDesignation,
        staff_phone: body.staffPhone,
        staff_email: body.staffEmail,
        bill_file_url: body.billFileUrl,
        room_photo_url: body.roomPhotoUrl,
        total_requested_amount: body.totalRequested || 0,
        total_approved_amount: 0,
        total_rejected_amount: 0,
        ai_summary: body.aiSummary || null,
        ai_summary_generated_at: body.aiSummary ? timestamp : null,
        submitted_at: timestamp,
        reviewed_at: null,
        completed_at: null,
        created_at: timestamp,
        updated_at: timestamp
      });

    // Insert claim items if provided
    if (body.medicalCharges && body.medicalCharges.length > 0) {
      const itemsToInsert = body.medicalCharges.map((item: any) => ({
        claim_id: claim.id,
        category: item.category,
        subcategory: item.subcategory,
        field_name: item.fieldName,
        requested_amount: item.requestedAmount || 0,
        status: 'pending'
      }));

      await createClaimItems(itemsToInsert.map((item: any) => ({
        ...item,
        approved_amount: 0,
        rejected_amount: 0,
        rejection_reason: null,
        notes: null,
        created_at: timestamp,
        updated_at: timestamp
      })));
    }

    // Create status history entry
    await createStatusHistory({
      claim_id: claim.id,
      status: 'submitted',
      notes: 'Claim submitted by hospital',
      created_at: timestamp
    });

    // Create notification for insurance company
    await createNotification({
      user_type: 'agent',
      user_identifier: body.companyId,
      claim_id: claim.id,
      title: 'New Claim Submitted',
      message: `A new claim has been submitted for ${body.patientName}`
    });

    return NextResponse.json({
      success: true,
      claimId: claim.id,
      claimNumber
    });

  } catch (error: any) {
    console.error('Claims API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const claimNumber = searchParams.get('claimNumber');
    const patientName = searchParams.get('patientName');
    const patientPhone = searchParams.get('patientPhone');

    let claims = await listClaims();

    // Apply filters
    if (companyId) {
      const company = await findCompanyByIdentifier(companyId);
      if (company) {
        claims = claims.filter((claim) => claim.company_id === company.id);
      } else if (companyId.includes('-')) {
        claims = claims.filter((claim) => claim.company_id === companyId);
      } else {
        claims = [];
      }
    }
    
    if (status) {
      claims = claims.filter((claim) => claim.status === status);
    }
    
    if (claimNumber) {
      const search = claimNumber.toLowerCase();
      claims = claims.filter((claim) => (claim.claim_number || '').toLowerCase().includes(search));
    }
    
    if (patientName) {
      const search = patientName.toLowerCase();
      claims = claims.filter((claim) => (claim.patient_name || '').toLowerCase().includes(search));
    }
    
    if (patientPhone) {
      const search = patientPhone.toLowerCase();
      claims = claims.filter((claim) => (claim.patient_phone || '').toLowerCase().includes(search));
    }

    const data = await Promise.all(claims.map((claim) => hydrateClaim(claim)));

    return NextResponse.json({
      success: true,
      claims: data
    });

  } catch (error: any) {
    console.error('Claims API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
