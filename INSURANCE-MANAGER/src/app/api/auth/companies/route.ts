import { NextRequest, NextResponse } from 'next/server';
import { listCompanies } from '@/lib/firebase/repository';

export async function GET(request: NextRequest) {
  try {
    const companies = await listCompanies();
    return NextResponse.json({
      success: true,
      companies: companies.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}