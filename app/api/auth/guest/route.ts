import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { hcaptchaToken } = body;

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

    const supabase = await createClient();
    
    // Create anonymous user
    let guestData;
    try {
      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            is_guest: true,
            created_at: new Date().toISOString(),
          }
        }
      });

      if (error) {
        console.error('Guest login: Error creating guest user', error);
        return NextResponse.json(
          { error: error.message || 'Failed to create guest session. Please ensure anonymous authentication is enabled in Supabase.' },
          { status: 500 }
        );
      }

      if (!data.user || !data.session) {
        console.error('Guest login: No user or session returned from Supabase');
        return NextResponse.json(
          { error: 'Failed to create guest session. Please check Supabase configuration.' },
          { status: 500 }
        );
      }

      guestData = data;
      console.log('Guest login: Successfully created guest user', data.user.id);
    } catch (supabaseError: any) {
      console.error('Guest login: Supabase exception', supabaseError);
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
