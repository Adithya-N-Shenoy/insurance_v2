import { NextRequest, NextResponse } from 'next/server';
import { findCompanyByIdentifier, listClaims } from '@/lib/firebase/repository';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const companyId = params.id;
    const company = await findCompanyByIdentifier(companyId);
    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const claims = (await listClaims()).filter((claim) => claim.company_id === company.id);

    const stats = {
      totalClaims: claims.length,
      pendingClaims: claims.filter(c => ['submitted', 'under_review'].includes(c.status)).length,
      approvedClaims: claims.filter(c => ['approved', 'completed'].includes(c.status)).length,
      rejectedClaims: claims.filter(c => c.status === 'rejected').length,
      totalRequested: claims.reduce((sum, c) => sum + (c.total_requested_amount || 0), 0),
      totalApproved: claims.reduce((sum, c) => sum + (c.total_approved_amount || 0), 0)
    };

    return NextResponse.json({
      success: true,
      company: {
        ...company,
        stats
      }
    });

  } catch (error: any) {
    console.error('Company details API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
