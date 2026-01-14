import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limiter';
import { isAdmin } from '@/lib/admin-utils';

// GET - Fetch community templates
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const university = searchParams.get('university');
    const course = searchParams.get('course');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'usage'; // 'usage', 'votes', 'newest'

    // Get current user for vote status
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('community_templates')
      .select('*')
      .eq('is_public', true);

    if (university) {
      query = query.ilike('university', `%${university}%`);
    }

    if (course) {
      query = query.ilike('course', `%${course}%`);
    }

    // Sort by different criteria (votes will be sorted in JavaScript after fetch)
    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'usage') {
      query = query.order('usage_count', { ascending: false });
    } else {
      // For votes, we'll sort by net votes in JavaScript
      query = query.order('created_at', { ascending: false }); // Default order
    }

    query = query.limit(limit);

    const { data: templates, error } = await query;

    if (error) throw error;

    // Sort by net votes if needed (since we can't do computed columns in Supabase query)
    let sortedTemplates = templates || [];
    if (sortBy === 'votes') {
      sortedTemplates = [...sortedTemplates].sort((a, b) => {
        const netA = (a.upvotes || 0) - (a.downvotes || 0);
        const netB = (b.upvotes || 0) - (b.downvotes || 0);
        return netB - netA; // Descending order
      });
    }

    // Fetch user's votes for each template if authenticated
    let userVotes: Record<string, string> = {};
    if (user) {
      const templateIds = (sortedTemplates || []).map(t => t.id);
      if (templateIds.length > 0) {
        const { data: votes } = await supabase
          .from('community_template_votes')
          .select('template_id, vote_type')
          .eq('user_id', user.id)
          .in('template_id', templateIds);

        if (votes) {
          votes.forEach(vote => {
            userVotes[vote.template_id] = vote.vote_type;
          });
        }
      }
    }

    // Add user vote status to each template
    const templatesWithVotes = (sortedTemplates || []).map(template => ({
      ...template,
      userVote: userVotes[template.id] || null,
      upvotes: template.upvotes || 0,
      downvotes: template.downvotes || 0,
    }));

    return NextResponse.json({ templates: templatesWithVotes });
  } catch (error: any) {
    console.error('Error fetching community templates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST - Create a new community template
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting: 10 templates per day per user
    const rateLimitResult = rateLimit(getIdentifier(user.id), RATE_LIMITS.TEMPLATE_SHARE);
    
    if (!rateLimitResult.success) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / (1000 * 60 * 60));
      return NextResponse.json(
        { error: `Too many templates shared. Please try again in ${resetIn} hours.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, description, university, course, semester, templateData, creatorName } = body;

    if (!name || !templateData) {
      return NextResponse.json(
        { error: 'Name and template data are required' },
        { status: 400 }
      );
    }

    // Input validation
    if (name.length > 100 || (description && description.length > 500)) {
      return NextResponse.json(
        { error: 'Name or description too long' },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from('community_templates')
      .insert({
        name,
        description,
        university,
        course,
        semester,
        template_data: templateData,
        creator_id: user.id,
        creator_name: creatorName || 'Anonymous',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error creating community template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create template' },
      { status: 500 }
    );
  }
}

// PATCH - Increment usage count and auto-upvote
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Increment usage count
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });

    if (error) {
      // Fallback if RPC doesn't exist
      const { data: template } = await supabase
        .from('community_templates')
        .select('usage_count')
        .eq('id', templateId)
        .single();

      await supabase
        .from('community_templates')
        .update({ usage_count: (template?.usage_count || 0) + 1 })
        .eq('id', templateId);
    }

    // Auto-upvote: Check if user has already voted
    const { data: existingVote } = await supabase
      .from('community_template_votes')
      .select('vote_type')
      .eq('template_id', templateId)
      .eq('user_id', user.id)
      .single();

    if (!existingVote) {
      // User hasn't voted yet - add upvote
      await supabase
        .from('community_template_votes')
        .insert({
          template_id: templateId,
          user_id: user.id,
          vote_type: 'upvote',
        });
    } else if (existingVote.vote_type === 'downvote') {
      // User had downvoted - change to upvote
      await supabase
        .from('community_template_votes')
        .update({ vote_type: 'upvote' })
        .eq('template_id', templateId)
        .eq('user_id', user.id);
    }
    // If user already upvoted, do nothing

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating template usage:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update usage' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a community template (creator or admin)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    // Verify template exists
    const { data: template, error: fetchError } = await supabase
      .from('community_templates')
      .select('creator_id, name')
      .eq('id', templateId)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id);

    // Allow deletion if user is creator OR admin
    if (template.creator_id !== user.id && !userIsAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You can only delete your own templates' },
        { status: 403 }
      );
    }

    // Delete the template (cascade will handle votes)
    const { error: deleteError } = await supabase
      .from('community_templates')
      .delete()
      .eq('id', templateId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ 
      success: true,
      message: userIsAdmin ? 'Template deleted by admin' : 'Template deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete template' },
      { status: 500 }
    );
  }
}
