import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/session-utils";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized - Admin access required",
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

    // Get active sessions - any admin can see any active session
    const { data: activeSessions, error } = await supabase
      .from("class_sessions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ClassParticipation] Active sessions fetch error:", error);
      return NextResponse.json(
        {
          success: false,
          message: "Failed to fetch active sessions",
        },
        { status: 500 },
      );
    }

    // Return the most recent active session
    return NextResponse.json({
      success: true,
      session:
        activeSessions && activeSessions.length > 0 ? activeSessions[0] : null,
    });
  } catch (error: any) {
    console.error("[ClassParticipation] Active sessions error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
