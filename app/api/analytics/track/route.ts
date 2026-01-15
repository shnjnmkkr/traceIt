import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const body = await request.json();
    const { 
      pagePath, 
      pageTitle, 
      referrer, 
      userAgent, 
      sessionId,
      featureName,
      featureData 
    } = body;

    // Get IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || null;

    const isGuest = user?.user_metadata?.is_guest || false;

    // Track page view
    if (pagePath) {
      await supabase.from('page_views').insert({
        user_id: user?.id || null,
        session_id: sessionId || null,
        page_path: pagePath,
        page_title: pageTitle || null,
        referrer: referrer || null,
        user_agent: userAgent || null,
        ip_address: ip,
        is_guest: isGuest,
      });
    }

    // Track feature usage if provided
    if (featureName) {
      await supabase.from('feature_usage').insert({
        user_id: user?.id || null,
        session_id: sessionId || null,
        feature_name: featureName,
        feature_data: featureData || null,
        is_guest: isGuest,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking analytics:', error);
    // Don't fail the request if analytics fails
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
