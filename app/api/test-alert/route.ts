import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import WorkerScript from '@/models/WorkerScript';
import Alert from '@/models/Alert';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[TEST ALERT] Received test data:', body);
    
    await connectDB();
    
    // Create a test alert
    const testAlert = new Alert({
      userId: null,
      scriptName: body.scriptName || 'test-script',
      fullPath: body.fullPath || 'https://example.com/test',
      time: new Date(),
      sourceIP: body.sourceIP || '127.0.0.1',
      responseCode: 403,
      detectedKeywords: body.detectedKeywords || ['test-keyword'],
    });
    
    try {
      await testAlert.save();
      console.log('[TEST ALERT] Test alert saved successfully:', testAlert._id);
    } catch (saveError) {
      console.error('[TEST ALERT SAVE ERROR]', saveError);
    }
    
    // Check if any user has trigger alert enabled
    const usersWithAlert = await User.find({ triggerAlertEnabled: true });
    console.log('[TEST ALERT] Users with alert enabled:', usersWithAlert.length);
    
    if (usersWithAlert.length > 0) {
      // Check if any script has enableAlert set to true
      const scriptsWithAlert = await WorkerScript.find({ 
        userId: { $in: usersWithAlert.map(u => u._id) },
        enableAlert: true
      });
      
      console.log('[TEST ALERT] Scripts with alert enabled:', scriptsWithAlert.length);
      
      if (scriptsWithAlert.length > 0) {
        console.log('[TEST ALERT] Alert processing completed');
      }
    }
    
    let scriptsWithAlertCount = 0;
    if (usersWithAlert.length > 0) {
      const scriptsWithAlert = await WorkerScript.find({ 
        userId: { $in: usersWithAlert.map(u => u._id) },
        enableAlert: true
      });
      scriptsWithAlertCount = scriptsWithAlert.length;
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test alert processed',
      alertId: testAlert._id,
      usersWithAlert: usersWithAlert.length,
      scriptsWithAlert: scriptsWithAlertCount
    });
  } catch (error) {
    console.error('[TEST ALERT ERROR]', error);
    return NextResponse.json({ error: 'Test alert failed' }, { status: 400 });
  }
}

export async function GET() {
  try {
    await connectDB();
    
    // Get alert statistics
    const totalAlerts = await Alert.countDocuments();
    const usersWithAlert = await User.countDocuments({ triggerAlertEnabled: true });
    const scriptsWithAlert = await WorkerScript.countDocuments({ enableAlert: true });
    
    return NextResponse.json({
      totalAlerts,
      usersWithAlert,
      scriptsWithAlert,
      message: 'Alert system status'
    });
  } catch (error) {
    console.error('[TEST ALERT GET ERROR]', error);
    return NextResponse.json({ error: 'Failed to get alert status' }, { status: 500 });
  }
} 