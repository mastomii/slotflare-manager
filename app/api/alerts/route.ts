import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Alert from '@/models/Alert';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const alerts = await Alert.find().sort({ createdAt: -1 });
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    await Alert.deleteMany({});
    return NextResponse.json({ message: 'All alerts deleted successfully' });
  } catch (error) {
    console.error('Delete all alerts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 