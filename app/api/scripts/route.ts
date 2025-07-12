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
    const template = `// Attach an event listener to handle 'fetch' events
addEventListener('fetch', event => {
    // Respond to the fetch event with the custom handleRequest function
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url); // Parse the URL of the incoming request
    const path = url.pathname; // Extract the path from the URL

    // List of whitelisted paths (content check is skipped for these paths)
    const whitelistPaths = [${(whitelistPaths || []).map((p: string) => `'${p}'`).join(', ')}];

    // List of forbidden keywords to block if found in the content
    const forbiddenKeywords = [${(keywords || []).map((k: string) => `'${k}'`).join(', ')}];

    // If the request path is in the whitelist, return the original response without checking
    if (whitelistPaths.includes(path)) {
        return fetch(request);
    }

    // Fetch the original response from the origin server
    const response = await fetch(request);

    // Clone the response to read its content while preserving the original
    let responseClone = response.clone();
    let contentType = response.headers.get('Content-Type') || ''; // Get the Content-Type header

    let body; // Variable to store the response body

    // Parse the response body based on the content type
    if (contentType.includes('application/json')) {
        body = await responseClone.json(); // Parse JSON content
    } else if (contentType.includes('text')) {
        body = await responseClone.text(); // Parse plain text content
    } else {
        // If the content is not JSON or text, return the original response as is
        return response;
    }

    let containsForbidden = false; // Flag to check for forbidden keywords

    // Check for forbidden keywords in the response body
    if (typeof body === 'string') {
        // If the body is a string, directly search for forbidden keywords
        containsForbidden = forbiddenKeywords.some(keyword => body.includes(keyword));
    } else if (typeof body === 'object') {
        // If the body is an object (JSON), convert it to a string for keyword searching
        const bodyString = JSON.stringify(body);
        containsForbidden = forbiddenKeywords.some(keyword => bodyString.includes(keyword));
    }

    // If any forbidden keyword is found, block the response with a 403 status
    if (containsForbidden) {
        // Trigger alert if enabled
        if (${enableAlert}) {
            try {
                const alertData = {
                    fullPath: request.url,
                    time: new Date().toISOString(),
                    sourceIP: request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown',
                    responseCode: 403,
                    scriptName: '${scriptName}',
                    detectedKeywords: forbiddenKeywords.filter(keyword => 
                        typeof body === 'string' ? body.includes(keyword) : JSON.stringify(body).includes(keyword)
                    )
                };
                
                // Send alert to trigger endpoint
                fetch('${process.env.NEXTAUTH_URL || 'https://slotflare-manager.vercel.app'}/api/trigger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(alertData)
                }).catch(err => console.error('Alert trigger failed:', err));
            } catch (error) {
                console.error('Error sending alert:', error);
            }
        }
        
        return new Response('Forbidden: Content blocked.', { status: 403 });
    }

    // If no forbidden keywords are found, return the original response
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