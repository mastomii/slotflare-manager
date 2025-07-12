import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import WorkerScript from '@/models/WorkerScript';
import Alert from '@/models/Alert';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    await connectDB();
    
    // Check if this is an alert from worker script
    if (body.fullPath && body.scriptName) {
      let userId = null;
      const script = await WorkerScript.findOne({ scriptName: body.scriptName });
      if (script) {
        userId = script.userId;
      }
      const alert = new Alert({
        userId,
        scriptName: body.scriptName,
        fullPath: body.fullPath,
        time: new Date(body.time),
        sourceIP: body.sourceIP,
        responseCode: body.responseCode,
        detectedKeywords: body.detectedKeywords || [],
      });
      try {
              await alert.save();
    } catch (saveError) {
      console.error('[ALERT SAVE ERROR]', saveError);
    }
  }
    
    // Check if any user has trigger alert enabled
    const usersWithAlert = await User.find({ triggerAlertEnabled: true });
    
    if (usersWithAlert.length > 0) {
      // Check if any script has enableAlert set to true
      const scriptsWithAlert = await WorkerScript.find({ 
        userId: { $in: usersWithAlert.map(u => u._id) },
        enableAlert: true
      });
      
      if (scriptsWithAlert.length > 0) {
        // Here you can add custom alert processing logic
        // For example: send email, push notification, etc.
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TRIGGER ERROR]', error);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
} 