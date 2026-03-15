import { NextRequest, NextResponse } from 'next/server';
import { findCompanyByIdentifier, hydrateClaim, listClaims } from '@/lib/firebase/repository';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;

    console.log('Fetching claims for company:', companyId);

    const company = await findCompanyByIdentifier(companyId);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const rawClaims = (await listClaims()).filter((claim) => claim.company_id === company.id);
    const claims = await Promise.all(rawClaims.map((claim) => hydrateClaim(claim)));

    // Get summary statistics
    const summary = {
      total: claims.length,
      pending: claims.filter(c => c.status === 'submitted' || c.status === 'under_review').length,
      approved: claims.filter(c => c.status === 'approved' || c.status === 'completed').length,
      rejected: claims.filter(c => c.status === 'rejected').length,
      partial: claims.filter(c => c.status === 'partial').length,
      totalAmount: claims.reduce((sum, c) => sum + (c.total_requested_amount || 0), 0)
    };

    return NextResponse.json({
      success: true,
      companyId: company.id,
      claims,
      summary
    });

  } catch (error: any) {
    console.error('Company claims API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
