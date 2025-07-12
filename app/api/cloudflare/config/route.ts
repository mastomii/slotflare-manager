import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiToken, accountId } = await request.json();

    if (!apiToken || !accountId) {
      return NextResponse.json(
        { error: 'API token and account ID are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const updateResult = await User.findByIdAndUpdate(session.user.id, {
      cloudflareApiToken: apiToken,
      accountId: accountId,
    });

    // Verify the update
    const updatedUser = await User.findById(session.user.id);

    return NextResponse.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('❌ Cloudflare config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}