import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('Guest login: Request received');
    const body = await request.json();
    const { hcaptchaToken } = body;
    console.log('Guest login: Body parsed, hcaptchaToken present:', !!hcaptchaToken);

    // Verify hCaptcha token
    if (!hcaptchaToken) {
      console.error('Guest login: Missing hCaptcha token');
      return NextResponse.json(
        { error: 'hCaptcha verification required' },
        { status: 400 }
      );
    }

    // Verify with hCaptcha API
    const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;
    if (!hcaptchaSecret) {
      console.error('Guest login: HCAPTCHA_SECRET_KEY not configured');
      return NextResponse.json(
        { error: 'Server configuration error: hCaptcha secret key missing' },
        { status: 500 }
      );
    }

    try {
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

      if (!verifyResponse.ok) {
        console.error('Guest login: hCaptcha API error', verifyResponse.status, await verifyResponse.text());
        return NextResponse.json(
          { error: 'hCaptcha verification service error' },
          { status: 500 }
        );
      }

      const verifyData = await verifyResponse.json();
      console.log('Guest login: hCaptcha verification result', verifyData);

      if (!verifyData.success) {
        console.error('Guest login: hCaptcha verification failed', verifyData['error-codes']);
        return NextResponse.json(
          { error: `hCaptcha verification failed: ${verifyData['error-codes']?.join(', ') || 'Unknown error'}` },
          { status: 400 }
        );
      }
    } catch (verifyError: any) {
      console.error('Guest login: hCaptcha verification exception', verifyError);
      return NextResponse.json(
        { error: `hCaptcha verification error: ${verifyError.message}` },
        { status: 500 }
      );
    }

    console.log('Guest login: Creating Supabase client');
    const supabase = await createClient();
    
    // Create anonymous user
    let guestData;
    try {
      console.log('Guest login: Calling signInAnonymously');
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            is_guest: true,
            created_at: new Date().toISOString(),
          }
        }
      });

      console.log('Guest login: signInAnonymously response', { 
        hasError: !!error, 
        hasData: !!data, 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        errorMessage: error?.message 
      });

      if (error) {
        console.error('Guest login: Error creating guest user', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        });
        return NextResponse.json(
          { error: error.message || 'Failed to create guest session. Please ensure anonymous authentication is enabled in Supabase.' },
          { status: 500 }
        );
      }

      if (!data) {
        console.error('Guest login: No data returned from signInAnonymously');
        return NextResponse.json(
          { error: 'No data returned from authentication service' },
          { status: 500 }
        );
      }

      if (!data.user) {
        console.error('Guest login: No user returned from signInAnonymously');
        return NextResponse.json(
          { error: 'No user returned from authentication service' },
          { status: 500 }
        );
      }

      if (!data.session) {
        console.error('Guest login: No session returned from signInAnonymously');
        return NextResponse.json(
          { error: 'No session returned from authentication service. This may indicate a Supabase configuration issue.' },
          { status: 500 }
        );
      }

      guestData = data;
      console.log('Guest login: Successfully created guest user', {
        userId: data.user.id,
        hasSession: !!data.session,
        sessionExpiresAt: data.session.expires_at
      });
    } catch (supabaseError: any) {
      console.error('Guest login: Supabase exception', {
        message: supabaseError.message,
        name: supabaseError.name,
        stack: supabaseError.stack,
        cause: supabaseError.cause
      });
      return NextResponse.json(
        { error: `Failed to create guest session: ${supabaseError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Type guard: guestData is guaranteed to have user and session at this point
    if (!guestData || !guestData.user || !guestData.session) {
      console.error('Guest login: Unexpected null values after successful creation');
      return NextResponse.json(
        { error: 'Failed to create guest session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      user: {
        id: guestData.user.id,
        is_guest: true,
      },
      session: guestData.session 
    });
  } catch (error: any) {
    console.error('Error in guest route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create guest session' },
      { status: 500 }
    );
  }
}
