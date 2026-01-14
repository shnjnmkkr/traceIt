import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
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

    const formData = await request.formData();
    
    const type = formData.get('type') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const email = formData.get('email') as string;
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

    // Create report object
    const report: any = {
      type: type || 'bug',
      timestamp: new Date().toISOString(),
      title,
      category,
      description,
      userEmail: email,
      deviceInfo,
      screenshot: screenshot ? screenshot.name : null,
    };

    if (type === 'bug') {
      report.severity = severity;
      report.expectedBehavior = expectedBehavior;
      report.actualBehavior = actualBehavior;
      report.stepsToReproduce = stepsToReproduce;
    }

    console.log(`=== ${type?.toUpperCase() || 'BUG'} REPORT RECEIVED ===`);
    console.log(JSON.stringify(report, null, 2));
    console.log('===========================');

    // If screenshot exists, save it (optional - for development)
    if (screenshot) {
      try {
        const bytes = await screenshot.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Save to public/bug-reports folder (create it if needed)
        const filename = `${Date.now()}-${screenshot.name}`;
        const path = join(process.cwd(), 'public', 'bug-reports', filename);
        
        // Note: You'll need to create the public/bug-reports directory manually
        await writeFile(path, buffer);
        console.log(`Screenshot saved: ${filename}`);
      } catch (error) {
        console.error('Error saving screenshot:', error);
        // Continue even if screenshot save fails
      }
    }

    // TODO: Configure email service to receive reports
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
      message: `${type === 'bug' ? 'Bug report' : 'Feature suggestion'} submitted successfully` 
    });
  } catch (error: any) {
    console.error('Error processing report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process report' },
      { status: 500 }
    );
  }
}
