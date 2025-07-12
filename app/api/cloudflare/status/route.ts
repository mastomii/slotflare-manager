import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ configured: false, hasApiToken: false, hasAccountId: false });
    }
    const user = await User.findById(session.user.id);
    const hasApiToken = !!user?.cloudflareApiToken;
    const hasAccountId = !!user?.accountId;
    const configured = hasApiToken && hasAccountId;
    return NextResponse.json({ configured, hasApiToken, hasAccountId });
  } catch (error) {
    console.error('❌ Status API error:', error);
    return NextResponse.json({ configured: false, hasApiToken: false, hasAccountId: false });
  }
} 