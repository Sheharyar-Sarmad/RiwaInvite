import { NextRequest, NextResponse } from 'next/server';
import { generateCloudinarySignature } from '@/config/cloudinary';

export async function GET(req: NextRequest) {
  const adminId = req.headers.get('x-admin-id');
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Generate signature for the frontend to use
  const signatureData = generateCloudinarySignature('template-assets');

  return NextResponse.json({
    status: 'success',
    data: signatureData
  });
}