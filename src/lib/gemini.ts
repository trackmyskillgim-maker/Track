/**
 * Gemini API Integration for Class Participation Module
 * Handles question generation and code evaluation with retry logic
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// Configuration
const RETRY_ATTEMPTS = 2
const RETRY_DELAYS = [500, 1000] // Exponential backoff in ms
const REQUEST_TIMEOUT = 10000 // 10 seconds
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] // Primary and fallback models

interface GenerateQuestionResult {
  success: boolean
  question?: string
  error?: string
}

interface EvaluateCodeResult {
  success: boolean
  review?: 'Pass' | 'Fail'
  comment?: string
  error?: string
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Generate coding question using Gemini AI
 * @param topic - The coding topic (e.g., "loops", "functions")
 * @param difficulty - Difficulty level (Easy, Medium, Hard)
 * @param description - Optional additional context for question generation
 * @returns Generated question with example input/output
 */
export async function generateQuestion(
  topic: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  description?: string
): Promise<GenerateQuestionResult> {
  const prompt = `You are an AI question generator for coding classes.
Generate one coding question in Python based on the topic: "${topic}" and difficulty level: "${difficulty}".
${description ? `Additional context: ${description}` : ''}
The output must only include:

Question: <clear problem statement>
Example Input: <one sample input>
Example Output: <corresponding expected output>

Keep the question relevant, testable, and aligned with the chosen difficulty.`

  // Try each model in sequence (primary then fallback)
  for (let modelIndex = 0; modelIndex < MODELS.length; modelIndex++) {
    const modelName = MODELS[modelIndex]

    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

        // Get generative model
        const model = genAI.getGenerativeModel({ model: modelName })
        console.log(`[Gemini] Using model: ${modelName} (attempt ${attempt + 1})`)

        // Generate content
        const result = await model.generateContent(prompt)
        clearTimeout(timeoutId)

        const response = await result.response
        const text = response.text()

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini API')
        }

        console.log(`[Gemini] Success with ${modelName}`)
        return {
          success: true,
          question: text.trim()
        }

      } catch (error: any) {
        const errorMsg = error.message || String(error)
        console.error(`[Gemini] ${modelName} attempt ${attempt + 1} failed:`, errorMsg)

        // Check if it's a 503 (overloaded) error
        const isOverloaded = errorMsg.includes('503') || errorMsg.includes('overloaded')

        // If overloaded and we have a fallback model, skip to next model
        if (isOverloaded && modelIndex < MODELS.length - 1 && attempt === 0) {
          console.log(`[Gemini] ${modelName} overloaded, trying fallback model`)
          break // Exit retry loop and try next model
        }

        // If this is the last attempt for the last model, return error
        if (attempt === RETRY_ATTEMPTS && modelIndex === MODELS.length - 1) {
          return {
            success: false,
            error: 'Failed to generate question after multiple attempts. Please try again.'
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAYS[attempt])
        }
      }
    }
  }

  return {
    success: false,
    error: 'Failed to generate question. Please try again.'
  }
}

/**
 * Evaluate student code using Gemini AI
 * @param question - The original question text
 * @param studentCode - Student's submitted code
 * @returns Evaluation result with Pass/Fail and feedback
 */
export async function evaluateCode(
  question: string,
  studentCode: string
): Promise<EvaluateCodeResult> {
  const prompt = `You are an AI code evaluator.
Evaluate the following student solution for the question.

Question: "${question}"
Student Code:
"""
${studentCode}
"""

Instructions:
- Run hidden test cases mentally and judge correctness.
- If the code works correctly even with different inputs (not just the example), consider it Pass.
- Ignore minor syntax or style differences if logic is correct.
- If the code clearly fails or has logical/syntax issues, mark it Fail.
- Be objective but not overly strict.

Output must be strictly in this JSON structure:

{
  "Review": "Pass" or "Fail",
  "Comment": "<short constructive feedback or hint>"
}`

  // Try each model in sequence (primary then fallback)
  for (let modelIndex = 0; modelIndex < MODELS.length; modelIndex++) {
    const modelName = MODELS[modelIndex]

    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

        // Get generative model
        const model = genAI.getGenerativeModel({ model: modelName })
        console.log(`[Gemini] Evaluating with model: ${modelName} (attempt ${attempt + 1})`)

        // Generate content
        const result = await model.generateContent(prompt)
        clearTimeout(timeoutId)

        const response = await result.response
        const text = response.text()

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini API')
        }

        // Parse JSON response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('Invalid JSON response from Gemini')
        }

        const evaluation = JSON.parse(jsonMatch[0])

        // Validate response structure
        if (!evaluation.Review || !evaluation.Comment) {
          throw new Error('Missing Review or Comment in response')
        }

        // Normalize review to Pass/Fail
        const review = evaluation.Review.toLowerCase().includes('pass') ? 'Pass' : 'Fail'

        console.log(`[Gemini] Evaluation success with ${modelName}`)
        return {
          success: true,
          review: review as 'Pass' | 'Fail',
          comment: evaluation.Comment
        }

      } catch (error: any) {
        const errorMsg = error.message || String(error)
        console.error(`[Gemini] ${modelName} evaluation attempt ${attempt + 1} failed:`, errorMsg)

        // Check if it's a 503 (overloaded) error
        const isOverloaded = errorMsg.includes('503') || errorMsg.includes('overloaded')

        // If overloaded and we have a fallback model, skip to next model
        if (isOverloaded && modelIndex < MODELS.length - 1 && attempt === 0) {
          console.log(`[Gemini] ${modelName} overloaded, trying fallback model for evaluation`)
          break // Exit retry loop and try next model
        }

        // If this is the last attempt for the last model, return error
        if (attempt === RETRY_ATTEMPTS && modelIndex === MODELS.length - 1) {
          return {
            success: false,
            error: 'evaluation_pending'
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAYS[attempt])
        }
      }
    }
  }

  return {
    success: false,
    error: 'evaluation_pending'
  }
}

/**
 * Test Gemini API connection
 * @returns True if API key is valid and connection works
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length === 0) {
      console.error('[Gemini] API key not configured')
      return false
    }

    const model = genAI.getGenerativeModel({ model: MODELS[0] })
    const result = await model.generateContent('Test connection. Reply with "OK".')
    const response = await result.response
    const text = response.text()

    console.log('[Gemini] Connection test successful:', text.substring(0, 50))
    return true

  } catch (error: any) {
    console.error('[Gemini] Connection test failed:', error.message)
    return false
  }
}

/**
 * Validate Gemini API key format
 */
export function isGeminiConfigured(): boolean {
  return !!(GEMINI_API_KEY && GEMINI_API_KEY.startsWith('AIzaSy'))
}