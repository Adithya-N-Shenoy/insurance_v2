import { NextRequest, NextResponse } from 'next/server';
import { listHospitals } from '@/lib/firebase/repository';

export async function GET(request: NextRequest) {
  try {
    const hospitals = await listHospitals();
    return NextResponse.json({
      success: true,
      hospitals: hospitals.map(h => ({
        id: h.id,
        name: h.name,
        address: h.address,
        city: h.city,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching hospitals:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch hospitals' },
      { status: 500 }
    );
  }
}