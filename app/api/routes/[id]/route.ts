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