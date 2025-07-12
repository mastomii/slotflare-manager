import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import WorkerScript from '@/models/WorkerScript';
import DeployLog from '@/models/DeployLog';
import User from '@/models/User';
import { CloudflareAPI } from '@/lib/cloudflare';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const script = await WorkerScript.findOne({ _id: params.id, userId: session.user.id });
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    // Check if script is used in any active routes
    const Route = (await import('@/models/Route')).default;
    const activeRoutes = await Route.find({ 
      userId: session.user.id, 
      scriptName: script.scriptName,
      status: { $ne: 'deleted' }
    });
    
    if (activeRoutes.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete script "${script.scriptName}". This script is currently used by ${activeRoutes.length} active route(s). Please delete all routes using this script before deleting the script.`,
        routesCount: activeRoutes.length,
        scriptName: script.scriptName
      }, { status: 400 });
    }
    // Hapus dari Cloudflare
    const user = await User.findById(session.user.id);
    if (!user || !user.cloudflareApiToken || !user.accountId) {
      return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 400 });
    }
    const cf = new CloudflareAPI(user.cloudflareApiToken, user.accountId);
    await cf.deleteScript(script.scriptName);
    // Hapus dari DB
    await WorkerScript.deleteOne({ _id: params.id });
    // Log ke DeployLog
    await DeployLog.create({
      userId: session.user.id,
      actionType: 'delete',
      entityType: 'script',
      entityId: script._id.toString(),
      snapshot: script.toObject(),
      status: 'success',
    });
    return NextResponse.json({ message: 'Script deleted successfully' });
  } catch (error) {
    console.error('Delete script error:', error);
    // Log error ke DeployLog jika memungkinkan
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        await DeployLog.create({
          userId: session.user.id,
          actionType: 'delete',
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

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const script = await WorkerScript.findOne({ _id: params.id, userId: session.user.id });
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }
    
    const { scriptName, keywords, whitelistPaths, enableAlert } = await request.json();
    
    // Get user credentials for Cloudflare
    const user = await User.findById(session.user.id);
    if (!user || !user.cloudflareApiToken || !user.accountId) {
      return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 400 });
    }
    
    const cf = new CloudflareAPI(user.cloudflareApiToken, user.accountId);
    
    // Store old script name for Cloudflare update
    const oldScriptName = script.scriptName;
    
    // Update script data
    script.scriptName = scriptName || script.scriptName;
    script.keywords = keywords || script.keywords;
    script.whitelistPaths = whitelistPaths || script.whitelistPaths;
    script.enableAlert = enableAlert !== undefined ? enableAlert : script.enableAlert;
    
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
    
    // Deploy to Cloudflare
    if (scriptName && scriptName !== oldScriptName) {
      // Delete old script and deploy new one
      await cf.deleteScript(oldScriptName);
      await cf.deployScript(script.scriptName, template);
    } else {
      // Update existing script
      await cf.deployScript(script.scriptName, template);
    }
    
    await script.save();
    
    // Log ke DeployLog
    await DeployLog.create({
      userId: session.user.id,
      actionType: 'update',
      entityType: 'script',
      entityId: script._id.toString(),
      snapshot: script.toObject(),
      status: 'success',
    });
    
    return NextResponse.json({ message: 'Script updated successfully' });
  } catch (error) {
    console.error('Update script error:', error);
    // Log error ke DeployLog jika memungkinkan
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        await DeployLog.create({
          userId: session.user.id,
          actionType: 'update',
          entityType: 'script',
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