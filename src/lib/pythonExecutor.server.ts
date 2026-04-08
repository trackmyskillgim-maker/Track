import { spawn } from 'child_process'
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Enhanced interfaces for server-side execution
export interface ServerPythonResult {
  success: boolean
  output?: string
  error?: string
  timeout?: boolean
  executionTime?: number
}

export interface TestCaseInput {
  input: string
  expectedOutput: string
  description?: string
}

export interface ServerTestResult {
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
  error?: string
  executionTime?: number
}

export interface UniversalTestResults {
  success: boolean
  passedCount: number
  totalCount: number
  results: ServerTestResult[]
  overallError?: string
  totalExecutionTime?: number
}

/**
 * Execute Python code using a real Python subprocess
 * This is the core of our universal grading system
 */
export async function executeServerPython(
  code: string,
  timeoutMs: number = 10000
): Promise<ServerPythonResult> {
  const startTime = Date.now()

  // Create temporary file for code execution
  const tempDir = mkdtempSync(join(tmpdir(), 'python-exec-'))
  const tempFile = join(tempDir, 'code.py')

  try {
    // Write code to temporary file
    writeFileSync(tempFile, code, 'utf8')

    return await new Promise((resolve) => {
      const pythonProcess = spawn('python3', [tempFile], {
        timeout: timeoutMs,
        killSignal: 'SIGKILL'
      })

      let stdout = ''
      let stderr = ''
      let isResolved = false

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      pythonProcess.on('close', (code) => {
        if (isResolved) return
        isResolved = true

        const executionTime = Date.now() - startTime

        if (code === 0) {
          resolve({
            success: true,
            output: stdout.trim(),
            executionTime
          })
        } else {
          resolve({
            success: false,
            error: stderr.trim() || `Process exited with code ${code}`,
            executionTime
          })
        }
      })

      pythonProcess.on('error', (error) => {
        if (isResolved) return
        isResolved = true

        resolve({
          success: false,
          error: `Python execution failed: ${error.message}`,
          executionTime: Date.now() - startTime
        })
      })

      // Handle timeout
      setTimeout(() => {
        if (isResolved) return
        isResolved = true

        pythonProcess.kill('SIGKILL')
        resolve({
          success: false,
          timeout: true,
          error: 'Code execution timed out',
          executionTime: timeoutMs
        })
      }, timeoutMs)
    })

  } catch (error) {
    return {
      success: false,
      error: `Failed to execute Python code: ${error instanceof Error ? error.message : 'Unknown error'}`,
      executionTime: Date.now() - startTime
    }
  } finally {
    // Cleanup
    try {
      unlinkSync(tempFile)
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Parse input parameters for Python function calls
 * Handles various Python data types intelligently
 */
export function parseInputForPython(input: string): string {
  try {
    const trimmed = input.trim()

    // Handle empty input
    if (!trimmed) return ''

    // If it's already valid Python syntax, use it
    try {
      // Test if it's valid Python by trying to evaluate it as JSON first
      const parsed = JSON.parse(trimmed)
      return formatPythonValue(parsed)
    } catch {
      // Not JSON, try to handle as raw Python

      // Handle common cases
      if (trimmed === 'True' || trimmed === 'False') return trimmed
      if (trimmed === 'None') return trimmed

      // Handle strings (if not quoted, add quotes)
      if (!trimmed.startsWith('"') && !trimmed.startsWith("'") &&
          !trimmed.startsWith('[') && !trimmed.startsWith('{') &&
          isNaN(Number(trimmed))) {
        return `"${trimmed}"`
      }

      return trimmed
    }
  } catch {
    // Fallback: treat as string
    return `"${input}"`
  }
}

/**
 * Format a JavaScript value as Python syntax
 */
function formatPythonValue(value: any): string {
  if (value === null) return 'None'
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'string') return `"${value.replace(/"/g, '\\"')}"`
  if (typeof value === 'number') return value.toString()
  if (Array.isArray(value)) {
    return `[${value.map(formatPythonValue).join(', ')}]`
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).map(([k, v]) =>
      `"${k}": ${formatPythonValue(v)}`
    )
    return `{${entries.join(', ')}}`
  }
  return String(value)
}

/**
 * Execute a specific function with test cases - THE UNIVERSAL GRADER
 * This is the main function that replaces our old fake Python executor
 */
export async function executeUniversalTests(
  userCode: string,
  functionName: string,
  testCases: TestCaseInput[],
  timeoutMs: number = 5000
): Promise<UniversalTestResults> {
  const startTime = Date.now()
  const results: ServerTestResult[] = []
  let passedCount = 0

  // Validate that function exists in code
  const functionPattern = new RegExp(`def\\s+${functionName}\\s*\\([^)]*\\):`)
  if (!functionPattern.test(userCode)) {
    return {
      success: false,
      passedCount: 0,
      totalCount: testCases.length,
      results: [],
      overallError: `Function '${functionName}' not found in your code. Please implement the '${functionName}' function with the correct name.`
    }
  }

  // Process each test case
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    const testStartTime = Date.now()

    try {
      // Parse the input parameters
      const pythonInput = parseInputForPython(testCase.input)

      // Create the test code
      const testCode = `${userCode}

# Test execution
try:
    result = ${functionName}(${pythonInput})
    print(repr(result))
except Exception as e:
    print(f"ERROR: {e}")
    raise
`

      // Execute the test
      const executionResult = await executeServerPython(testCode, timeoutMs)
      const testExecutionTime = Date.now() - testStartTime

      if (executionResult.success && executionResult.output) {
        // Parse the actual output
        const actualOutput = parseActualOutput(executionResult.output)

        // Compare with expected output
        const passed = compareUniversalOutputs(actualOutput, testCase.expectedOutput)
        if (passed) passedCount++

        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput,
          passed,
          executionTime: testExecutionTime
        })
      } else {
        // Execution failed
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          error: executionResult.error || 'Unknown execution error',
          executionTime: testExecutionTime
        })
      }

    } catch (error) {
      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: '',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - testStartTime
      })
    }
  }

  return {
    success: true,
    passedCount,
    totalCount: testCases.length,
    results,
    totalExecutionTime: Date.now() - startTime
  }
}

/**
 * Parse the actual output from Python execution
 */
function parseActualOutput(rawOutput: string): string {
  try {
    // Remove any extra whitespace/newlines
    const cleaned = rawOutput.trim()

    // If it starts with ERROR:, it's an error message
    if (cleaned.startsWith('ERROR:')) {
      return cleaned
    }

    // Try to evaluate Python repr() output back to a readable format
    // For now, just return the cleaned output
    return cleaned
  } catch {
    return rawOutput.trim()
  }
}

/**
 * Compare outputs with intelligent type awareness
 */
function compareUniversalOutputs(actual: string, expected: string): boolean {
  // Normalize both outputs
  const actualTrim = actual.trim()
  const expectedTrim = expected.trim()

  // Exact match
  if (actualTrim === expectedTrim) return true

  // Try parsing both as JSON and compare
  try {
    const actualParsed = JSON.parse(actualTrim)
    const expectedParsed = JSON.parse(expectedTrim)
    return JSON.stringify(actualParsed) === JSON.stringify(expectedParsed)
  } catch {
    // Not JSON, continue with other comparisons
  }

  // Handle Python boolean/None representations
  const pythonNormalizations = [
    [/True/g, 'true'],
    [/False/g, 'false'],
    [/None/g, 'null']
  ]

  let normalizedActual = actualTrim
  let normalizedExpected = expectedTrim

  pythonNormalizations.forEach(([pattern, replacement]: any) => {
    normalizedActual = normalizedActual.replace(pattern, replacement)
    normalizedExpected = normalizedExpected.replace(pattern, replacement)
  })

  if (normalizedActual === normalizedExpected) return true

  // Numeric comparison with tolerance
  const actualNum = parseFloat(actualTrim)
  const expectedNum = parseFloat(expectedTrim)

  if (!isNaN(actualNum) && !isNaN(expectedNum)) {
    return Math.abs(actualNum - expectedNum) < 0.0001
  }

  return false
}

/**
 * Validate Python code for basic syntax
 */
export async function validatePythonSyntax(code: string): Promise<{valid: boolean, error?: string}> {
  const syntaxCheckCode = `
import ast
import sys

code = '''${code.replace(/'/g, "\\'")}'''

try:
    ast.parse(code)
    print("SYNTAX_OK")
except SyntaxError as e:
    print(f"SYNTAX_ERROR: {e}")
except Exception as e:
    print(f"OTHER_ERROR: {e}")
`

  const result = await executeServerPython(syntaxCheckCode, 3000)

  if (result.success && result.output) {
    if (result.output.includes('SYNTAX_OK')) {
      return { valid: true }
    } else if (result.output.includes('SYNTAX_ERROR:')) {
      return {
        valid: false,
        error: result.output.replace('SYNTAX_ERROR:', '').trim()
      }
    }
  }

  return {
    valid: false,
    error: result.error || 'Could not validate syntax'
  }
}