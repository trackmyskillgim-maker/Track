import { supabase } from "./supabase";

/**
 * Check if a user is a CR for a given session's subject
 * @param userId - The user ID to check
 * @param sessionId - The class session ID
 * @returns true if user is CR for the session's subject, false otherwise
 */
export async function isCRForSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  try {
    // Get the session's subject_id
    const { data: session } = await supabase
      .from("class_sessions")
      .select("subject_id")
      .eq("id", sessionId)
      .single();

    if (!session?.subject_id) {
      return false;
    }

    // Check if user is CR for this subject
    const { data: crEnrollment } = await supabase
      .from("student_subjects")
      .select("is_cr")
      .eq("student_id", userId)
      .eq("subject_id", session.subject_id)
      .eq("is_cr", true)
      .single();

    return !!crEnrollment;
  } catch (error) {
    console.error("Error checking CR permissions:", error);
    return false;
  }
}

/**
 * Check if a user can manage a class participation session
 * Allows both admins who created the session AND CRs for the subject
 */
export async function canManageSession(
  userId: string,
  userRole: string,
  sessionId: string,
): Promise<{ canManage: boolean; reason?: string }> {
  try {
    // Get session details
    const { data: session } = await supabase
      .from("class_sessions")
      .select("id, created_by, subject_id")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return { canManage: false, reason: "Session not found" };
    }

    // Any admin can manage any session
    if (userRole === "admin") {
      return { canManage: true };
    }

    // Student who is CR for the subject can manage
    if (userRole === "student" && session.subject_id) {
      const isCR = await isCRForSession(userId, sessionId);
      if (isCR) {
        return { canManage: true };
      }
    }

    return {
      canManage: false,
      reason: "Not authorized to manage this session",
    };
  } catch (error) {
    console.error("Error checking session management permissions:", error);
    return { canManage: false, reason: "Permission check failed" };
  }
}
