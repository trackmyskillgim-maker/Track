import { getUserId } from "@/lib/session-utils";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const raiseHandSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "student") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized - Student access required",
        },
        { status: 401 },
      );
    }

    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid session",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { sessionId } = raiseHandSchema.parse(body);

    // Verify session is active and matches student's credentials
    const { data: user } = await supabase
      .from("users")
      .select("year, batch, course, section")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 },
      );
    }

    // Support both batch (new) and year (old) fields for backward compatibility
    const userBatch = user.batch || user.year;

    if (!userBatch || !user.course || !user.section) {
      return NextResponse.json(
        {
          success: false,
          message: "User profile incomplete",
        },
        { status: 400 },
      );
    }

    const { data: classSession } = await supabase
      .from("class_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("year", userBatch) // class_sessions.year stores batch value
      .eq("course", user.course)
      .eq("section", user.section)
      .eq("status", "active")
      .single();

    if (!classSession) {
      return NextResponse.json(
        {
          success: false,
          message: "Session not found or not accessible",
        },
        { status: 404 },
      );
    }

    // If session has a subject, verify student is enrolled
    if (classSession.subject_id) {
      const { data: enrollment } = await supabase
        .from("student_subjects")
        .select("id")
        .eq("student_id", userId)
        .eq("subject_id", classSession.subject_id)
        .single();

      if (!enrollment) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You are not enrolled in the subject for this session. Please contact your admin.",
          },
          { status: 403 },
        );
      }
    }

    // Get current question ID
    const currentQuestionId = classSession.current_question_id;
    if (!currentQuestionId) {
      return NextResponse.json(
        {
          success: false,
          message: "No active question in this session",
        },
        { status: 400 },
      );
    }

    // Check if already in queue for THIS question
    const { data: existing } = await supabase
      .from("participation_queue")
      .select("*")
      .eq("session_id", sessionId)
      .eq("question_id", currentQuestionId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "You are already in the queue",
          position: existing.position,
        },
        { status: 400 },
      );
    }

    // QUEUE LIMIT: Max 5 students per question
    const { data: queueCount } = await supabase
      .from("participation_queue")
      .select("id", { count: "exact" })
      .eq("session_id", sessionId)
      .eq("question_id", currentQuestionId);

    if (queueCount && queueCount.length >= 5) {
      return NextResponse.json(
        {
          success: false,
          message: "Queue is full (maximum 5 students per question)",
        },
        { status: 400 },
      );
    }

    // Get next position for THIS question
    const { data: nextPos } = await supabase.rpc("get_next_queue_position", {
      p_session_id: sessionId,
      p_question_id: currentQuestionId,
    });

    // Check if anyone is currently attempting
    const { data: attempting } = await supabase
      .from("participation_queue")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "attempting")
      .limit(1);

    // Determine initial status based on auto-advance and queue state
    const shouldGrantImmediateAccess =
      classSession.auto_advance_enabled &&
      (!attempting || attempting.length === 0);
    const initialStatus = shouldGrantImmediateAccess ? "attempting" : "waiting";

    // Add to queue
    const { data: queueEntry, error: queueError } = await supabase
      .from("participation_queue")
      .insert({
        session_id: sessionId,
        user_id: userId,
        question_id: currentQuestionId,
        position: nextPos || 1,
        status: initialStatus,
        ...(shouldGrantImmediateAccess && {
          access_granted_at: new Date().toISOString(),
        }),
      })
      .select("*")
      .single();

    if (queueError) {
      console.error("[ClassParticipation] Raise hand error:", queueError);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to join queue",
        },
        { status: 500 },
      );
    }

    // Get count of previous submissions by this student in this session
    const { data: previousSubmissions } = await supabase
      .from("session_submissions")
      .select("id", { count: "exact" })
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    const previousSubmissionCount = previousSubmissions?.length || 0;

    return NextResponse.json({
      success: true,
      position: queueEntry.position,
      accessGranted: shouldGrantImmediateAccess,
      message: shouldGrantImmediateAccess
        ? "Access granted! You can start coding now."
        : `You are #${queueEntry.position} in queue`,
      previousSubmissions: previousSubmissionCount, // For UI indicators
    });
  } catch (error: any) {
    console.error("[ClassParticipation] Raise hand error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input data",
          errors: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
