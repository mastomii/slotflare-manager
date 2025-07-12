import { NextResponse } from 'next/server';

export async function GET() {
  // Check if registration is enabled
  const enableRegistration = process.env.ENABLE_REGISTRATION !== 'false';
  
  if (!enableRegistration) {
    return NextResponse.json(
      { error: 'Registration is currently disabled' },
      { status: 403 }
    );
  }

  return NextResponse.json(
    { enabled: true },
    { status: 200 }
  );
} 