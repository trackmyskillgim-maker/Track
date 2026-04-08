"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import StudentHeader from "@/components/student/StudentHeader";
import SessionInfoCard from "@/components/class-participation/student/SessionInfoCard";
import HandRaiseSection from "@/components/class-participation/student/HandRaiseSection";
import CodeEditorSection from "@/components/class-participation/student/CodeEditorSection";
import ResultPanel from "@/components/class-participation/student/ResultPanel";
import StudentParticipationHistory from "@/components/class-participation/student/StudentParticipationHistory";
import { useClassParticipationStudent } from "@/lib/hooks/useClassParticipationStudent";
import useSWR from "swr";

type TabType = "active" | "history";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ClassParticipationStudent() {
  const router = useRouter();
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [previousQuestionId, setPreviousQuestionId] = useState<string | null>(
    null,
  );

  // Check if user is CR
  const { data: userData } = useSWR(
    "/api/student/dashboard-optimized",
    fetcher,
  );

  const {
    session,
    hasSession,
    questionPublished,
    queueData,
    inQueue,
    hasAccess,
    mutateQueue,
  } = useClassParticipationStudent();

  // Clear submission result when question changes
  useEffect(() => {
    const currentQuestionId = session?.question_id;

    // If question ID changed, clear previous submission result
    if (currentQuestionId && currentQuestionId !== previousQuestionId) {
      setSubmissionResult(null);
      setPreviousQuestionId(currentQuestionId);
    }

    // If question is removed (null), also clear submission
    if (!currentQuestionId && previousQuestionId) {
      setSubmissionResult(null);
      setPreviousQuestionId(null);
    }
  }, [session?.question_id, previousQuestionId]);

  const handleRaiseHand = () => {
    mutateQueue();
  };

  const handleSubmitCode = async (result: any) => {
    setSubmissionResult(result);
    mutateQueue(); // Refresh queue status

    // Poll for status updates - always poll to catch professor re-evaluations
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/class-participation/student/submission-status?sessionId=${session?.id}&questionId=${session?.question_id}`)
        const data = await res.json()

        if (data.success) {
          // Update if result, feedback, or XP changed
          setSubmissionResult((prev: any) => {
            if (prev.result !== data.result || prev.xpAwarded !== data.xpAwarded || prev.feedback !== data.feedback) {
              return {
                result: data.result,
                feedback: data.feedback,
                xpAwarded: data.xpAwarded
              }
            }
            return prev
          })
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 3000) // Poll every 3 seconds

    // Clean up polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000)

    // Store interval ID for cleanup
    return () => clearInterval(pollInterval)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StudentHeader title="Class Participation" />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CR Panel Button */}
        {userData?.user?.is_cr && (
          <div className="mb-4">
            <button
              onClick={() => router.push("/class-participation/cr")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              CR Dashboard
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "active"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Active Session
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-2 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            My History
          </button>
        </div>

        {activeTab === "active" ? (
          !hasSession ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Active Session
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your professor hasn&apos;t started a class participation session
                yet.
                <br />
                This page will automatically update when a session becomes
                available.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Session Info */}
              <SessionInfoCard session={session} />

              {/* Waiting for Question State */}
              {!questionPublished && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-12 text-center">
                  <div className="text-6xl mb-4">⏳</div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Waiting for Question
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your professor is preparing the next question.
                    <br />
                    This page will automatically update when a question is
                    published.
                  </p>
                </div>
              )}

              {questionPublished && !submissionResult && (
                <>
                  {/* Hand Raise Section */}
                  {!inQueue && (
                    <HandRaiseSection
                      sessionId={session.id}
                      questionId={session.question_id}
                      onRaiseHand={handleRaiseHand}
                    />
                  )}

                  {/* Queue Status */}
                  {inQueue && !hasAccess && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
                      <div className="text-4xl mb-3">⏳</div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        You&apos;re in the Queue!
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300">
                        Position:{" "}
                        <span className="font-bold text-2xl">
                          #{queueData.position}
                        </span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Total in queue: {queueData.totalInQueue}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                        Please wait for the professor to grant you access...
                      </p>
                    </div>
                  )}

                  {/* Code Editor (unlocked when access granted) */}
                  {hasAccess && (
                    <CodeEditorSection
                      sessionId={session.id}
                      question={session.question_text}
                      onSubmit={handleSubmitCode}
                    />
                  )}
                </>
              )}

              {/* Result Panel */}
              {submissionResult && <ResultPanel result={submissionResult} />}
            </div>
          )
        ) : (
          <StudentParticipationHistory />
        )}
      </div>
    </div>
  );
}
