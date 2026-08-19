import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rateLimit, RATE_LIMITS, getIdentifier } from "@/lib/rate-limiter";
import { isAdmin } from "@/lib/admin-utils";

async function syncTemplateVoteCounts(supabase: any, templateId: string) {
  const { count: upvotes } = await supabase
    .from("community_template_votes")
    .select("*", { count: "exact", head: true })
    .eq("template_id", templateId)
    .eq("vote_type", "upvote");

  const { count: downvotes } = await supabase
    .from("community_template_votes")
    .select("*", { count: "exact", head: true })
    .eq("template_id", templateId)
    .eq("vote_type", "downvote");

  const up = upvotes || 0;
  const down = downvotes || 0;

  await supabase
    .from("community_templates")
    .update({ upvotes: up, downvotes: down })
    .eq("id", templateId);

  return { upvotes: up, downvotes: down };
}

// GET - Fetch community templates
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const university = searchParams.get("university");
    const course = searchParams.get("course");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sortBy = searchParams.get("sortBy") || "usage"; // "usage", "votes", "newest"

    const { data: { user } } = await supabase.auth.getUser();
    const userIsAdmin = user ? await isAdmin(user.id) : false;

    let query = supabase.from("community_templates").select("*");
    
    if (!userIsAdmin) {
      query = query.eq("is_public", true);
    }

    if (university) {
      query = query.ilike("university", `%${university}%`);
    }

    if (course) {
      query = query.ilike("course", `%${course}%`);
    }

    const { data: templates, error } = await query;
    if (error) throw error;

    let userVotes: Record<string, string> = {};
    if (user) {
      const templateIds = (templates || []).map(t => t.id);
      if (templateIds.length > 0) {
        const { data: votes } = await supabase
          .from("community_template_votes")
          .select("template_id, vote_type")
          .eq("user_id", user.id)
          .in("template_id", templateIds);

        if (votes) {
          votes.forEach(vote => {
            userVotes[vote.template_id] = vote.vote_type;
          });
        }
      }
    }

    let processed = (templates || []).map(t => ({
      ...t,
      upvotes: t.upvotes || 0,
      downvotes: t.downvotes || 0,
      usage_count: t.usage_count || 0,
      netVotes: (t.upvotes || 0) - (t.downvotes || 0),
      userVote: userVotes[t.id] || null,
    }));

    if (sortBy === "votes") {
      processed.sort((a, b) => b.netVotes - a.netVotes || b.usage_count - a.usage_count || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "usage") {
      processed.sort((a, b) => b.usage_count - a.usage_count || b.netVotes - a.netVotes || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "newest") {
      processed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    processed = processed.slice(0, limit);

    return NextResponse.json({ templates: processed });
  } catch (error: any) {
    console.error("Error fetching community templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block guests from sharing community templates
    if (user.user_metadata?.is_guest) {
      return NextResponse.json(
        { error: "Guest users cannot share templates. Please sign up to share your timetable." },
        { status: 403 }
      );
    }

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
        { error: "Name and template data are required" },
        { status: 400 }
      );
    }

    const { data: template, error } = await supabase
      .from("community_templates")
      .insert({
        name,
        description,
        university,
        course,
        semester,
        template_data: templateData,
        creator_id: user.id,
        creator_name: creatorName || "Anonymous",
        upvotes: 0,
        downvotes: 0,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error("Error creating community template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: 500 }
    );
  }
}

// PATCH - Increment usage count and auto-upvote when adopting template
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, name } = body;

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    if (name !== undefined) {
      const userIsAdmin = await isAdmin(user.id);
      if (!userIsAdmin) {
        return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
      }

      const { data, error } = await supabase
        .from("community_templates")
        .update({ name })
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, template: data });
    }

    // Increment usage count
    const { data: currentTemplate } = await supabase
      .from("community_templates")
      .select("usage_count")
      .eq("id", templateId)
      .single();

    const newUsage = (currentTemplate?.usage_count || 0) + 1;
    await supabase
      .from("community_templates")
      .update({ usage_count: newUsage })
      .eq("id", templateId);

    // Auto-upvote if user is not a guest
    if (!user.user_metadata?.is_guest) {
      const { data: existingVote } = await supabase
        .from("community_template_votes")
        .select("vote_type")
        .eq("template_id", templateId)
        .eq("user_id", user.id)
        .single();

      if (!existingVote) {
        await supabase
          .from("community_template_votes")
          .insert({
            template_id: templateId,
            user_id: user.id,
            vote_type: "upvote",
          });
      } else if (existingVote.vote_type === "downvote") {
        await supabase
          .from("community_template_votes")
          .update({ vote_type: "upvote" })
          .eq("template_id", templateId)
          .eq("user_id", user.id);
      }
    }

    // Sync accurate vote counts
    const { upvotes, downvotes } = await syncTemplateVoteCounts(supabase, templateId);

    return NextResponse.json({
      success: true,
      usage_count: newUsage,
      upvotes,
      downvotes,
      userVote: user.user_metadata?.is_guest ? null : "upvote",
    });
  } catch (error: any) {
    console.error("Error updating template usage:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update usage" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a community template
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const { data: template, error: fetchError } = await supabase
      .from("community_templates")
      .select("creator_id, name")
      .eq("id", templateId)
      .single();

    if (fetchError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const userIsAdmin = await isAdmin(user.id);

    if (template.creator_id !== user.id && !userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own templates" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from("community_templates")
      .delete()
      .eq("id", templateId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete template" },
      { status: 500 }
    );
  }
}
