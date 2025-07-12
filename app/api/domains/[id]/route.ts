import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Domain from '@/models/Domain';
import DeployLog from '@/models/DeployLog';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const domain = await Domain.findOne({ _id: params.id, userId: session.user.id });
    if (!domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }
    
    // Check if domain is used in any active routes
    const Route = (await import('@/models/Route')).default;
    const activeRoutes = await Route.find({ 
      userId: session.user.id, 
      domainId: domain._id,
      status: { $ne: 'deleted' }
    });
    
    if (activeRoutes.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete domain "${domain.zoneName}". This domain is currently used by ${activeRoutes.length} active route(s). Please delete all routes using this domain before deleting the domain.`,
        routesCount: activeRoutes.length,
        domainName: domain.zoneName
      }, { status: 400 });
    }
    
    await Domain.deleteOne({ _id: params.id });
    
    // Log ke DeployLog - jika gagal, tetap return sukses
    try {
      await DeployLog.create({
        userId: session.user.id,
        actionType: 'delete',
        entityType: 'domain',
        entityId: domain._id.toString(),
        snapshot: domain.toObject(),
        status: 'success',
      });
    } catch (logError) {
      console.error('Failed to log to DeployLog:', logError);
      // Jangan return error, tetap return sukses karena data sudah dihapus
    }
    
    return NextResponse.json({ message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Delete domain error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Error message:', error instanceof Error ? error.message : 'No message');
    // Log error ke DeployLog jika memungkinkan
    try {
      const session = await getServerSession(authOptions);
      if (session) {
        await DeployLog.create({
          userId: session.user.id,
          actionType: 'delete',
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