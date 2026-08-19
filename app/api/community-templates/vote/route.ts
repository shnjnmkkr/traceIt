import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rateLimit, RATE_LIMITS, getIdentifier } from "@/lib/rate-limiter";

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

// POST - Vote on a template (upvote or downvote)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block guests from voting on community templates
    if (user.user_metadata?.is_guest) {
      return NextResponse.json(
        { error: "Guest users cannot vote on templates. Please sign up to vote." },
        { status: 403 }
      );
    }

    // Rate limiting: 50 votes per hour per user
    const rateLimitResult = rateLimit(getIdentifier(user.id, undefined), { interval: 60 * 60 * 1000, limit: 50 });
    
    if (!rateLimitResult.success) {
      const resetIn = Math.ceil((rateLimitResult.resetTime - Date.now()) / (1000 * 60));
      return NextResponse.json(
        { error: `Too many votes. Please try again in ${resetIn} minutes.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { templateId, voteType } = body;

    if (!templateId || !voteType) {
      return NextResponse.json(
        { error: "Template ID and vote type are required" },
        { status: 400 }
      );
    }

    if (!["upvote", "downvote"].includes(voteType)) {
      return NextResponse.json(
        { error: "Vote type must be \"upvote\" or \"downvote\"" },
        { status: 400 }
      );
    }

    // Check if user already voted
    const { data: existingVote, error: voteCheckError } = await supabase
      .from("community_template_votes")
      .select("*")
      .eq("template_id", templateId)
      .eq("user_id", user.id)
      .single();

    if (voteCheckError && voteCheckError.code !== "PGRST116") {
      throw voteCheckError;
    }

    let action = "added";

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Same vote type - remove the vote (toggle off)
        const { error: deleteError } = await supabase
          .from("community_template_votes")
          .delete()
          .eq("id", existingVote.id);

        if (deleteError) throw deleteError;
        action = "removed";
      } else {
        // Different vote type - update to new vote
        const { error: updateError } = await supabase
          .from("community_template_votes")
          .update({ vote_type: voteType })
          .eq("id", existingVote.id);

        if (updateError) throw updateError;
        action = "updated";
      }
    } else {
      // New vote
      const { error: insertError } = await supabase
        .from("community_template_votes")
        .insert({
          template_id: templateId,
          user_id: user.id,
          vote_type: voteType,
        });

      if (insertError) throw insertError;
      action = "added";
    }

    // Recalculate and sync accurate vote counts in database
    const { upvotes, downvotes } = await syncTemplateVoteCounts(supabase, templateId);

    return NextResponse.json({
      success: true,
      action,
      upvotes,
      downvotes,
    });
  } catch (error: any) {
    console.error("Error voting on template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to vote" },
      { status: 500 }
    );
  }
}

// GET - Get user vote for a template
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ voteType: null });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const { data: vote, error } = await supabase
      .from("community_template_votes")
      .select("vote_type")
      .eq("template_id", templateId)
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({ voteType: vote?.vote_type || null });
  } catch (error: any) {
    console.error("Error fetching user vote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch vote" },
      { status: 500 }
    );
  }
}
