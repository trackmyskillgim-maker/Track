import { NextResponse } from 'next/server'
import { generateQuestion, evaluateCode, testGeminiConnection, isGeminiConfigured } from '@/lib/gemini'

export async function GET() {
  const results = {
    configured: false,
    connected: false,
    questionGeneration: null as any,
    codeEvaluation: null as any,
    errors: [] as string[]
  }

  try {
    // Check if configured
    results.configured = isGeminiConfigured()
    if (!results.configured) {
      results.errors.push('GEMINI_API_KEY not configured')
      return NextResponse.json(results, { status: 500 })
    }

    // Test connection
    results.connected = await testGeminiConnection()
    if (!results.connected) {
      results.errors.push('Connection test failed')
      return NextResponse.json(results, { status: 500 })
    }

    // Test question generation
    const questionResult = await generateQuestion('loops', 'Easy')
    results.questionGeneration = questionResult

    if (!questionResult.success) {
      results.errors.push(`Question generation failed: ${questionResult.error}`)
    }

    // Test code evaluation
    const evalResult = await evaluateCode(
      'Write a loop that prints numbers 0 to 4',
      'for i in range(5):\n    print(i)'
    )
    results.codeEvaluation = evalResult

    if (!evalResult.success) {
      results.errors.push(`Code evaluation failed: ${evalResult.error}`)
    }

    return NextResponse.json(results)

  } catch (error: any) {
    results.errors.push(error.message)
    return NextResponse.json(results, { status: 500 })
  }
}