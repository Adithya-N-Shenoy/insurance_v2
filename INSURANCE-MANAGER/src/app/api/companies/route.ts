import { NextRequest, NextResponse } from 'next/server';
import { listClaims, listCompanies } from '@/lib/firebase/repository';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const [companies, claims] = await Promise.all([listCompanies(), listClaims()]);

    // Get claim counts for each company
    const companiesWithStats = companies.map((company) => {
        const companyClaims = claims.filter((claim) => claim.company_id === company.id);
        return {
          ...company,
          stats: {
            total: companyClaims.length,
            pending: companyClaims.filter(c => c.status === 'submitted' || c.status === 'under_review').length,
            approved: companyClaims.filter(c => c.status === 'approved' || c.status === 'completed').length
          }
        };
      });

    return NextResponse.json({
      success: true,
      companies: companiesWithStats
    });

  } catch (error: any) {
    console.error('Companies API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
