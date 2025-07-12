import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import DeployLog from '@/models/DeployLog';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const history = await DeployLog.find({ 
      userId: session.user.id 
    }).sort({ createdAt: -1 });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    await DeployLog.deleteMany({ userId: session.user.id });
    return NextResponse.json({ message: 'History cleared successfully' });
  } catch (error) {
    console.error('Clear history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}