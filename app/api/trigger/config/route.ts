import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ enabled: false });
  await connectDB();
  const user = await User.findById(session.user.id);
  return NextResponse.json({ enabled: !!(user && user.triggerAlertEnabled) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { enabled } = await request.json();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (typeof user.triggerAlertEnabled === 'undefined') {
    user.triggerAlertEnabled = false;
  }
  user.triggerAlertEnabled = enabled;
  await user.save();
  return NextResponse.json({ enabled: user.triggerAlertEnabled });
} 