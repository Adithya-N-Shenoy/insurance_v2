import { NextRequest, NextResponse } from 'next/server';
import { uploadBuffer } from '@/lib/firebase/repository';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60; // Maximum duration in seconds
export const dynamic = 'force-dynamic'; // Ensure dynamic execution

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!bucket) {
      return NextResponse.json(
        { error: 'No bucket specified' },
        { status: 400 }
      );
    }

    // Map incoming upload targets to Firebase Storage folders
    const bucketMap: Record<string, string> = {
      'bills': 'medical-bills',
      'room-photos': 'room-photos',
      'medical-bills': 'medical-bills'
    };

    const actualBucket = bucketMap[bucket] || bucket;

    // Validate that the bucket exists in our allowed list
    const allowedBuckets = ['medical-bills', 'room-photos'];
    if (!allowedBuckets.includes(actualBucket)) {
      return NextResponse.json(
        { error: `Invalid bucket: ${bucket}. Allowed buckets: medical-bills, room-photos` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and PDF are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${actualBucket}/${fileName}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    console.log(`Uploading to Firebase Storage path: ${filePath}`);
    const uploaded = await uploadBuffer({
      buffer,
      contentType: file.type,
      destination: filePath,
    });

    console.log('Upload successful, public URL:', uploaded.publicUrl);

    return NextResponse.json({
      success: true,
      filePath: uploaded.path,
      publicUrl: uploaded.publicUrl,
    });

  } catch (error: any) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
