import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/session-utils";

export async function GET() {
  try {
    const session = await getSession();
    console.log("[ActiveSession] Session:", JSON.stringify(session));
    console.log("[ActiveSession] Session role:", session?.role);

    if (!session || session.role !== "student") {
      console.log("[ActiveSession] Auth failed - No session or wrong role");
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

    // Get user details
    const { data: user } = await supabase
      .from("users")
      .select("year, course, section, batch")
      .eq("id", userId)
      .single();

    // Support both batch (new) and year (old) fields for backward compatibility
    const userBatch = user?.batch || user?.year;

    if (!user || !userBatch || !user.course || !user.section) {
      return NextResponse.json(
        {
          success: false,
          message: "User profile incomplete",
        },
        { status: 400 },
      );
    }

    // Get student's enrolled subjects
    const { data: enrollments } = await supabase
      .from("student_subjects")
      .select("subject_id")
      .eq("student_id", userId);

    const enrolledSubjectIds = enrollments?.map((e) => e.subject_id) || [];

    // Get ALL active sessions for this batch (we'll filter by subject/course/section below)
    const { data: sessions, error } = await supabase
      .from("class_sessions")
      .select(
        `
        *,
        subject:subjects(id, is_elective, course, section),
        current_question:session_questions!current_question_id(
          id,
          question_text,
          difficulty,
          is_published,
          status
        )
      `,
      )
      .eq("status", "active")
      .eq("year", userBatch)
      .limit(10); // Get multiple to filter in-memory

    console.log("[ActiveSession] Query result:", {
      sessions,
      error,
      enrolledSubjectIds,
    });

    if (error) {
      console.error("[ClassParticipation] Active session fetch error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch active session",
        },
        { status: 500 },
      );
    }

    // Filter sessions based on subject type
    const validSessions = (sessions || []).filter((session: any) => {
      // No subject linked - general session (match course+section)
      if (!session.subject_id) {
        return session.course === user.course && session.section === user.section;
      }

      // Check if student is enrolled in this subject
      if (!enrolledSubjectIds.includes(session.subject_id)) {
        return false;
      }

      // Student is enrolled - check subject type
      const subject = Array.isArray(session.subject) ? session.subject[0] : session.subject;

      // Elective subject - enrollment is enough (ignore course/section in session)
      if (subject?.is_elective) {
        return true;
      }

      // Regular subject - must match course AND section
      return session.course === user.course && session.section === user.section;
    });

    // No active session found
    if (!validSessions || validSessions.length === 0) {
      console.log("[ActiveSession] No active session found for this class");
      return NextResponse.json({
        success: true,
        session: null,
        message: "No active session for your class",
      });
    }

    // Flatten the session data with question details
    const classSession = validSessions[0];
    const currentQuestion = Array.isArray(classSession.current_question)
      ? classSession.current_question[0]
      : classSession.current_question;

    const responseData = {
      ...classSession,
      question_id: currentQuestion?.id || null,
      question_text: currentQuestion?.question_text || null,
      is_published: currentQuestion?.is_published || false,
      question_difficulty: currentQuestion?.difficulty || null,
      question_status: currentQuestion?.status || null,
      // Remove nested objects
      current_question: undefined,
      subject: undefined,
    };

    return NextResponse.json({
      success: true,
      session: responseData,
    });
  } catch (error: any) {
    console.error("[ClassParticipation] Active session error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
