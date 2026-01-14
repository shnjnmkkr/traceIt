import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  try {
    // Rate limiting: 5 reports per day per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const rateLimitResult = rateLimit(getIdentifier(undefined, ip), RATE_LIMITS.BUG_REPORT);
    
    if (!rateLimitResult.success) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / (1000 * 60 * 60));
      return NextResponse.json(
        { error: `Too many reports submitted. Please try again in ${resetIn} hours.` },
        { status: 429 }
      );
    }

    const supabase = await createClient();
    
    // Get user if logged in
    const { data: { user } } = await supabase.auth.getUser();

    const formData = await request.formData();
    
    const type = formData.get('type') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const email = formData.get('email') as string | null;
    const deviceInfo = formData.get('deviceInfo') as string;
    const screenshot = formData.get('screenshot') as File | null;
    
    // Bug-specific fields
    const severity = formData.get('severity') as string | null;
    const expectedBehavior = formData.get('expectedBehavior') as string | null;
    const actualBehavior = formData.get('actualBehavior') as string | null;
    const stepsToReproduce = formData.get('stepsToReproduce') as string | null;

    // Input validation
    if (!title || !description || title.length > 200 || description.length > 2000) {
      return NextResponse.json(
        { error: 'Invalid title or description length' },
        { status: 400 }
      );
    }

    // Validate screenshot size (max 5MB)
    if (screenshot && screenshot.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Screenshot must be less than 5MB' },
        { status: 400 }
      );
    }

    // Upload screenshot to Supabase Storage if provided
    let screenshotUrl: string | null = null;
    if (screenshot) {
      try {
        const bytes = await screenshot.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filename = `${Date.now()}-${screenshot.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('bug-reports')
          .upload(filename, buffer, {
            contentType: screenshot.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading screenshot:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('bug-reports')
            .getPublicUrl(filename);
          screenshotUrl = publicUrl;
        }
      } catch (error) {
        console.error('Error processing screenshot:', error);
        // Continue without screenshot
      }
    }

    // Save to database
    const reportData: any = {
      type: type || 'bug',
      title,
      description,
      category,
      user_email: email || null,
      device_info: deviceInfo,
      screenshot_url: screenshotUrl,
      user_id: user?.id || null,
    };

    if (type === 'bug') {
      reportData.severity = severity;
      reportData.expected_behavior = expectedBehavior;
      reportData.actual_behavior = actualBehavior;
      reportData.steps_to_reproduce = stepsToReproduce;
    }

    const { data: report, error: dbError } = await supabase
      .from('bug_reports')
      .insert(reportData)
      .select()
      .single();

    if (dbError) {
      console.error('Error saving bug report:', dbError);
      return NextResponse.json(
        { error: 'Failed to save report' },
        { status: 500 }
      );
    }
    // 
    // OPTION 1: Resend (Recommended - Free tier available)
    // 1. Sign up at https://resend.com
    // 2. Get your API key
    // 3. Add to .env.local: RESEND_API_KEY=re_...
    // 4. Install: npm install resend
    // 5. Uncomment the code below and update the email addresses
    /*
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const emailSubject = type === 'bug' 
      ? `[traceIt Bug] ${severity?.toUpperCase()} - ${title}`
      : `[traceIt Feature] ${title}`;
    
    const emailBody = type === 'bug' ? `
      <h2>🐛 Bug Report</h2>
      <p><strong>Severity:</strong> ${severity}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>User Email:</strong> ${email}</p>
      
      <h3>Description</h3>
      <p>${description}</p>
      
      ${expectedBehavior ? `<h3>Expected Behavior</h3><p>${expectedBehavior}</p>` : ''}
      ${actualBehavior ? `<h3>Actual Behavior</h3><p>${actualBehavior}</p>` : ''}
      ${stepsToReproduce ? `<h3>Steps to Reproduce</h3><pre>${stepsToReproduce}</pre>` : ''}
      
      <h3>Device Info</h3>
      <pre>${deviceInfo}</pre>
      
      ${screenshot ? `<p><strong>Screenshot:</strong> ${screenshot.name}</p>` : ''}
    ` : `
      <h2>💡 Feature Suggestion</h2>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>User Email:</strong> ${email}</p>
      
      <h3>Description</h3>
      <p>${description}</p>
      
      <h3>Device Info</h3>
      <pre>${deviceInfo}</pre>
      
      ${screenshot ? `<p><strong>Mockup/Screenshot:</strong> ${screenshot.name}</p>` : ''}
    `;
    
    await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: 'YOUR_EMAIL@example.com',  // <-- Change this to your email
      subject: emailSubject,
      html: emailBody,
    });
    */
    //
    // OPTION 2: Check console logs and public/bug-reports/ folder for now
    // Reports are logged to console and screenshots are saved locally

    return NextResponse.json({ 
      success: true, 
      message: `${type === 'bug' ? 'Bug report' : 'Feature suggestion'} submitted successfully`,
      reportId: report.id
    });
  } catch (error: any) {
    console.error('Error processing report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process report' },
      { status: 500 }
    );
  }
}
