import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Domain from '@/models/Domain';
import { CloudflareAPI } from '@/lib/cloudflare';
import User from '@/models/User';
import DeployLog from '@/models/DeployLog';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const domains = await Domain.find({ userId: session.user.id });
    return NextResponse.json(domains);
  } catch (error) {
    console.error('Get domains error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Ambil user dari database
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const { domainName } = await request.json();
    if (!domainName) {
      return NextResponse.json({ error: 'Domain name is required' }, { status: 400 });
    }
    if (!user.cloudflareApiToken || !user.accountId) {
      return NextResponse.json({ error: 'Please configure your Cloudflare API credentials first' }, { status: 400 });
    }
    const cf = new CloudflareAPI(
      user.cloudflareApiToken,
      user.accountId
    );
    const zones = await cf.getZones(domainName);
    const zone = zones.find(z => z.name === domainName);
    if (!zone) {
      return NextResponse.json({ error: 'Domain not found in your Cloudflare account' }, { status: 404 });
    }
    await connectDB();
    const existingDomain = await Domain.findOne({
      userId: session.user.id,
      zoneName: domainName,
    });
    if (existingDomain) {
      return NextResponse.json({ error: 'Domain already added' }, { status: 400 });
    }
    const domain = new Domain({
      userId: session.user.id,
      zoneName: zone.name,
      zoneId: zone.id,
      status: zone.status,
    });
    await domain.save();
    
    // Log ke DeployLog - jika gagal, tetap return sukses
    try {
      await DeployLog.create({
        userId: session.user.id,
        actionType: 'create',
        entityType: 'domain',
        entityId: domain._id.toString(),
        snapshot: domain.toObject(),
        status: 'success',
      });
    } catch (logError) {
      console.error('Failed to log to DeployLog:', logError);
      // Jangan return error, tetap return sukses karena data sudah tersimpan
    }
    
    return NextResponse.json(domain);
  }
  catch (error) {
    console.error('Add domain error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Error message:', error instanceof Error ? error.message : 'No message');
    // Log error ke DeployLog jika memungkinkan
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        await DeployLog.create({
          userId: session.user.id,
          actionType: 'create',
          entityType: 'domain',
          entityId: '-',
          snapshot: {},
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    } catch (logError) {
      console.error('Failed to log error to DeployLog:', logError);
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}