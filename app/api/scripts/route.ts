import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import WorkerScript from '@/models/WorkerScript';
import User from '@/models/User';
import { CloudflareAPI } from '@/lib/cloudflare';

import DeployLog from '@/models/DeployLog';

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
    // Generate script content from fixed template
    const template = `addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request, event));
});

async function handleRequest(request, event) {
    const url = new URL(request.url);
    const path = url.pathname;

    const whitelistPaths = [${(whitelistPaths || []).map((p: string) => `'${p}'`).join(', ')}];
    const forbiddenKeywords = [${(keywords || []).map((k: string) => `'${k}'`).join(', ')}];

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
        ${enableAlert ? `
        const alertData = {
            fullPath: request.url,
            time: new Date().toISOString(),
            sourceIP: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown',
            responseCode: 403,
            scriptName: '${scriptName}',
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