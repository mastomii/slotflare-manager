import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import WorkerScript from '@/models/WorkerScript';
import User from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { scriptName: string } }
) {
  try {
    await connectDB();
    
    const scriptName = params.scriptName;
    console.log('[DEBUG SCRIPT] Checking script:', scriptName);
    
    // Find the script
    const script = await WorkerScript.findOne({ scriptName });
    if (!script) {
      return NextResponse.json({ 
        error: 'Script not found',
        scriptName 
      }, { status: 404 });
    }
    
    // Find the user
    const user = await User.findById(script.userId);
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found for script',
        scriptName,
        userId: script.userId 
      }, { status: 404 });
    }
    
    // Check alert configuration
    const alertConfig = {
      scriptName: script.scriptName,
      scriptEnableAlert: script.enableAlert,
      userTriggerAlertEnabled: user.triggerAlertEnabled,
      scriptKeywords: script.keywords,
      scriptWhitelistPaths: script.whitelistPaths,
      userId: script.userId,
      userEmail: user.email,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt
    };
    
    console.log('[DEBUG SCRIPT] Alert configuration:', alertConfig);
    
    return NextResponse.json({
      success: true,
      alertConfig,
      message: 'Script debug information'
    });
  } catch (error) {
    console.error('[DEBUG SCRIPT ERROR]', error);
    return NextResponse.json({ error: 'Failed to debug script' }, { status: 500 });
  }
} 