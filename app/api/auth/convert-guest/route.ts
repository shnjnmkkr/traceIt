import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a guest
    if (!user.user_metadata?.is_guest) {
      return NextResponse.json(
        { error: 'User is not a guest account' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Update user with email and password, remove guest flag
    const { data, error } = await supabase.auth.updateUser({
      email,
      password,
      data: {
        is_guest: false,
        converted_at: new Date().toISOString(),
      }
    });

    if (error) {
      // Check if email is already in use
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'This email is already registered. Please sign in instead.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: error.message || 'Failed to convert account' },
        { status: 500 }
      );
    }

    // All data (timetables, attendance, settings) is already linked to user.id
    // So it will automatically be associated with the converted account
    // No migration needed!

    return NextResponse.json({ 
      success: true,
      message: 'Account converted successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
      }
    });
  } catch (error: any) {
    console.error('Error converting guest account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert account' },
      { status: 500 }
    );
  }
}
