import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import DeployLog from '@/models/DeployLog';
import Domain from '@/models/Domain';
import User from '@/models/User';
import { CloudflareAPI } from '@/lib/cloudflare';

import WorkerScript from '@/models/WorkerScript';
import Route from '@/models/Route';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const route = await Route.findOne({ _id: params.id, userId: session.user.id });
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    const domain = await Domain.findById(route.domainId);
    const script = await WorkerScript.findOne({ scriptName: route.scriptName, userId: session.user.id });
    const user = await User.findById(session.user.id);
    if (!user || !user.cloudflareApiToken || !user.accountId) {
      return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 400 });
    }
    const cf = new CloudflareAPI(user.cloudflareApiToken, user.accountId);
    try {
      if (route.routeId && domain) {
        await cf.deleteRoute(domain.zoneId, route.routeId);
      }
      // Hapus dari DB
      await Route.deleteOne({ _id: params.id });
      // Log ke DeployLog
      await DeployLog.create({
        userId: session.user.id,
        actionType: 'delete',
        entityType: 'route',
        entityId: route._id.toString(),
        snapshot: {
          domain: domain ? domain.toObject() : {},
          script: script ? script.toObject() : {},
          routePattern: route.routePattern,
          routeId: route.routeId || null,
        },
        status: 'success',
      });
      return NextResponse.json({ message: 'Route deleted successfully' });
    } catch (cfError: any) {
      await DeployLog.create({
        userId: session.user.id,
        actionType: 'delete',
        entityType: 'route',
        entityId: route._id.toString(),
        snapshot: {
          domain: domain ? domain.toObject() : {},
          script: script ? script.toObject() : {},
          routePattern: route.routePattern,
          routeId: route.routeId || null,
        },
        status: 'error',
        errorMessage: cfError instanceof Error ? cfError.message : 'Cloudflare error',
      });
      return NextResponse.json({ error: 'Failed to delete route: ' + (cfError instanceof Error ? cfError.message : 'Cloudflare error') }, { status: 500 });
    }
  } catch (error) {
    console.error('Delete route error:', error);
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        await DeployLog.create({
          userId: session.user.id,
          actionType: 'delete',
          entityType: 'route',
          entityId: params.id,
          snapshot: {},
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const route = await Route.findOne({ _id: params.id, userId: session.user.id });
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }
    
    const { routePattern, scriptName } = await request.json();
    
    // Get domain and script info
    const domain = await Domain.findById(route.domainId);
    const oldScript = await WorkerScript.findOne({ scriptName: route.scriptName, userId: session.user.id });
    const newScript = await WorkerScript.findOne({ scriptName: scriptName, userId: session.user.id });
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    
    if (!newScript) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    
    // Get user credentials for Cloudflare
    const user = await User.findById(session.user.id);
    if (!user || !user.cloudflareApiToken || !user.accountId) {
      return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 400 });
    }
    
    const cf = new CloudflareAPI(user.cloudflareApiToken, user.accountId);
    
    // Store old values for Cloudflare update
    const oldRoutePattern = route.routePattern;
    const oldScriptName = route.scriptName;
    
    // Update route data
    route.routePattern = routePattern || route.routePattern;
    route.scriptName = scriptName || route.scriptName;
    
    // Generate script content from fixed template for new script
    const template = `addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request, event) {
    const url = new URL(request.url);
    const path = url.pathname;

    const whitelistPaths = [${(newScript.whitelistPaths || []).map((p: string) => `'${p}'`).join(', ')}];
    const forbiddenKeywords = [${(newScript.keywords || []).map((k: string) => `'${k}'`).join(', ')}];

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
        ${newScript.enableAlert ? `
        const alertData = {
            fullPath: request.url,
            time: new Date().toISOString(),
            sourceIP: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown',
            responseCode: 403,
            scriptName: '${newScript.scriptName}',
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
    
    // Update in Cloudflare
    if (routePattern !== oldRoutePattern || scriptName !== oldScriptName) {
      if (route.routeId && domain) {
        // Route exists - just update it
        await cf.updateRoute(domain.zoneId, route.routeId, route.routePattern, route.scriptName);
      } else if (domain) {
        // Route doesn't exist yet - create new one
        const cfRoute = await cf.createRoute(domain.zoneId, route.routePattern, route.scriptName);
        route.routeId = cfRoute.result?.id;
      }
      
      // If script name changed, deploy the new script
      if (scriptName !== oldScriptName) {
        await cf.deployScript(route.scriptName, template);
      }
    }
    
    await route.save();
    
    // Log ke DeployLog
    await DeployLog.create({
      userId: session.user.id,
      actionType: 'update',
      entityType: 'route',
      entityId: route._id.toString(),
      snapshot: {
        domain: domain.toObject(),
        script: newScript.toObject(),
        routePattern: route.routePattern,
        routeId: route.routeId || null,
      },
      status: 'success',
    });
    
    return NextResponse.json({ message: 'Route updated successfully' });
  } catch (error) {
    console.error('Update route error:', error);
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        await DeployLog.create({
          userId: session.user.id,
          actionType: 'update',
          entityType: 'route',
          entityId: params.id,
          snapshot: {},
          status: 'error',
          errorMessage: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}