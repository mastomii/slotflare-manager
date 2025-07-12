import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Route from '@/models/Route';
import Domain from '@/models/Domain';
import WorkerScript from '@/models/WorkerScript';
import DeployLog from '@/models/DeployLog';
import { CloudflareAPI } from '@/lib/cloudflare';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const routes = await Route.find({ userId: session.user.id, status: { $ne: 'deleted' } }).sort({ createdAt: -1 });
    // Join ke domain dan script
    const detailedRoutes = await Promise.all(routes.map(async (route: any) => {
      const domain = await Domain.findById(route.domainId);
      const script = await WorkerScript.findOne({ scriptName: route.scriptName, userId: session.user.id });
      return {
        _id: route._id,
        zoneName: domain?.zoneName || '-',
        routePattern: route.routePattern,
        scriptName: route.scriptName,
        script: script ? {
          scriptName: script.scriptName,
          keywords: script.keywords,
          whitelistPaths: script.whitelistPaths,
        } : null,
        deployedAt: route.createdAt,
        status: route.status,
        routeId: route.routeId,
      };
    }));
    return NextResponse.json(detailedRoutes);
  } catch (error) {
    console.error('Get routes error:', error);
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
    await connectDB();
    const { domainId, scriptName, routePattern } = await request.json();
    if (!domainId || !scriptName || !routePattern) {
      return NextResponse.json({ error: 'domainId, scriptName, and routePattern are required' }, { status: 400 });
    }
    // Cek domain dan script
    const domain = await Domain.findById(domainId);
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    const script = await WorkerScript.findOne({ scriptName, userId: session.user.id });
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    // Deploy ke Cloudflare
    const user = await User.findById(session.user.id);
    if (!user || !user.cloudflareApiToken || !user.accountId) {
      return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 400 });
    }
    const cf = new CloudflareAPI(user.cloudflareApiToken, user.accountId);
    try {
      const routeResult = await cf.createRoute(domain.zoneId, routePattern, scriptName);
      // Simpan ke collection Route
      const newRoute = new Route({
        userId: session.user.id,
        domainId: domain._id,
        scriptName,
        routePattern,
        routeId: routeResult.result?.id || null,
        status: 'active',
      });
      await newRoute.save();
      // Log ke DeployLog
      await DeployLog.create({
        userId: session.user.id,
        actionType: 'create',
        entityType: 'route',
        entityId: newRoute._id.toString(),
        snapshot: {
          domain: domain.toObject(),
          script: script.toObject(),
          routePattern,
          routeId: routeResult.result?.id || null,
        },
        status: 'success',
      });
      return NextResponse.json({ message: 'Route deployed successfully' });
    } catch (cfError: any) {
      await DeployLog.create({
        userId: session.user.id,
        actionType: 'create',
        entityType: 'route',
        entityId: '-',
        snapshot: {
          domain: domain.toObject(),
          script: script.toObject(),
          routePattern,
        },
        status: 'error',
        errorMessage: cfError instanceof Error ? cfError.message : 'Cloudflare error',
      });
      return NextResponse.json({ error: 'Failed to deploy route: ' + (cfError instanceof Error ? cfError.message : 'Cloudflare error') }, { status: 500 });
    }
  } catch (error) {
    console.error('Deploy route error:', error);
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        await DeployLog.create({
          userId: session.user.id,
          actionType: 'create',
          entityType: 'route',
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