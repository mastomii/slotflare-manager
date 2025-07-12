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
    
    // Generate script content from fixed template
    const template = `addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request, event) {
    const url = new URL(request.url);
    const path = url.pathname;

    const whitelistPaths = [${(script.whitelistPaths || []).map((p: string) => `'${p}'`).join(', ')}];
    const forbiddenKeywords = [${(script.keywords || []).map((k: string) => `'${k}'`).join(', ')}];

    if (whitelistPaths.includes(path)) {
        return fetch(request);
    }

    const response = await fetch(request);
    const responseClone = response.clone();
    const contentType = response.headers.get('Content-Type') || '';

    let body;

    try {
        if (contentType.includes('application/json')) {
            body = await responseClone.json();
        } else if (contentType.includes('text')) {
            body = await responseClone.text();
        } else {
            return response;
        }
    } catch (err) {
        console.error('Failed to parse response body:', err);
        return response;
    }

    let containsForbidden = false;

    if (typeof body === 'string') {
        containsForbidden = forbiddenKeywords.some(keyword => body.includes(keyword));
    } else if (typeof body === 'object') {
        const bodyString = JSON.stringify(body);
        containsForbidden = forbiddenKeywords.some(keyword => bodyString.includes(keyword));
    }

    if (containsForbidden) {
        ${script.enableAlert ? `
        const alertData = {
            fullPath: request.url,
            time: new Date().toISOString(),
            sourceIP: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown',
            responseCode: 403,
            scriptName: '${script.scriptName}',
            detectedKeywords: forbiddenKeywords.filter(keyword =>
                typeof body === 'string'
                    ? body.includes(keyword)
                    : JSON.stringify(body).includes(keyword)
            )
        };

        // Kirim alert secara paralel, tapi pastikan Worker tidak menghentikan sebelum selesai
        event.waitUntil(
            fetch('${process.env.NEXTAUTH_URL || 'https://slotflare-manager.vercel.app'}/api/trigger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alertData)
            })
            .then(res => res.text().then(text => {
                console.log('ALERT RESPONSE', res.status, text);
            }))
            .catch(err => {
                console.error('Alert trigger failed:', err);
            })
        );` : ''}

        return new Response('Forbidden: Content blocked.', { status: 403 });
    }

    return response;
}`;
    
    try {
      // Deploy the script first
      await cf.deployScript(scriptName, template);
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