import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import WorkerScript from '@/models/WorkerScript';
import User from '@/models/User';
import { CloudflareAPI } from '@/lib/cloudflare';
import DeployLog from '@/models/DeployLog';
import { generateWorkerTemplate } from '@/lib/worker-template';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json([], { status: 401 });
    }
    await connectDB();
    const scripts = await WorkerScript.find({ userId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json(scripts);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const user = await User.findById(session.user.id);
    if (!user || !user.cloudflareApiToken || !user.accountId) {
      return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 400 });
    }
    const { scriptName, keywords, whitelistPaths, enableAlert } = await request.json();
    if (!scriptName || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ error: 'scriptName and keywords are required' }, { status: 400 });
    }
    // Simpan ke DB
    const script = new WorkerScript({
      userId: session.user.id,
      scriptName,
      keywords,
      whitelistPaths: whitelistPaths || [],
      enableAlert: enableAlert === true ? true : false,
    });
    await script.save();
    // Deploy ke Cloudflare
    const cf = new CloudflareAPI(user.cloudflareApiToken, user.accountId);
    // Generate script content using template
    const template = generateWorkerTemplate({
      scriptName,
      keywords,
      whitelistPaths: whitelistPaths || [],
      enableAlert: enableAlert === true,
    });
    await cf.deployScript(scriptName, template);
    // Log ke DeployLog
    await DeployLog.create({
      userId: session.user.id,
      actionType: 'create',
      entityType: 'script',
      entityId: script._id.toString(),
      snapshot: script.toObject(),
      status: 'success',
    });
    return NextResponse.json(script);
  } catch (error) {
    console.error('Create script error:', error);
    // Log error ke DeployLog jika memungkinkan
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        await DeployLog.create({
          userId: session.user.id,
          actionType: 'create',
          entityType: 'script',
          entityId: '-',
          snapshot: {},
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 