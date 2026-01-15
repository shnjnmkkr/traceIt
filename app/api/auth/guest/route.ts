import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hcaptchaToken } = body;

    // Verify hCaptcha token
    if (!hcaptchaToken) {
      return NextResponse.json(
        { error: 'hCaptcha verification required' },
        { status: 400 }
      );
    }

    // Verify with hCaptcha API
    const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;
    if (!hcaptchaSecret) {
      console.error('HCAPTCHA_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const verifyResponse = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: hcaptchaSecret,
        response: hcaptchaToken,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      return NextResponse.json(
        { error: 'hCaptcha verification failed' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Create anonymous user
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          is_guest: true,
          created_at: new Date().toISOString(),
        }
      }
    });

    if (error) {
      console.error('Error creating guest user:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create guest session' },
        { status: 500 }
      );
    }

    if (!data.user || !data.session) {
      return NextResponse.json(
        { error: 'Failed to create guest session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      user: {
        id: data.user.id,
        is_guest: true,
      },
      session: data.session 
    });
  } catch (error: any) {
    console.error('Error in guest route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create guest session' },
      { status: 500 }
    );
  }
}
