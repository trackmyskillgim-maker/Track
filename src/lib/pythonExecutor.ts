// Enhanced Python interpreter simulation with test case support
export interface PythonExecutionResult {
  output: string
  error?: string
  success: boolean
}

export interface TestCaseResult {
  input: string
  expectedOutput: string
  actualOutput: string
  passed: boolean
  error?: string
}

export interface TestExecutionResult {
  success: boolean
  passedCount: number
  totalCount: number
  results: TestCaseResult[]
  overallError?: string
}

export function simulatePythonExecution(code: string): PythonExecutionResult {
  try {
    let output = ''
    const lines = code.split('\n')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const variables: Record<string, any> = {}
    let insideFunction = false
    let functionName = ''
    let functionBody: string[] = []
    const functions: Record<string, string> = {}

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('#')) continue

      // Handle function definitions
      if (line.startsWith('def ')) {
        insideFunction = true
        const match = line.match(/def (\w+)\(([^)]*)\):/)
        if (match) {
          functionName = match[1]
          functionBody = []
        }
        continue
      }

      if (insideFunction) {
        if (line.startsWith('    ') || line.startsWith('\t')) {
          functionBody.push(line.replace(/^    /, ''))
        } else {
          // End of function
          functions[functionName] = functionBody.join('\n')
          insideFunction = false
        }

        if (i === lines.length - 1 && insideFunction) {
          functions[functionName] = functionBody.join('\n')
        }
        continue
      }

      // Handle print statements
      if (line.startsWith('print(')) {
        const content = line.match(/print\(([^)]+)\)/)
        if (content) {
          let value = content[1].trim()

          // Handle function calls in print
          for (const [funcName, funcBody] of Object.entries(functions)) {
            const funcCallRegex = new RegExp(`${funcName}\\(([^)]*)\\)`, 'g')
            if (value.includes(`${funcName}(`)) {
              const funcCall = value.match(funcCallRegex)
              if (funcCall) {
                const args = funcCall[0].match(/\(([^)]*)\)/)?.[1].trim() || ''
                let argValue = args
                if ((argValue.startsWith('"') && argValue.endsWith('"')) ||
                    (argValue.startsWith("'") && argValue.endsWith("'"))) {
                  argValue = argValue.slice(1, -1)
                }

                // Execute function body with argument
                if (funcBody.includes('return')) {
                  const returnLine = funcBody.split('\n').find(l => l.trim().startsWith('return'))
                  if (returnLine) {
                    let returnValue = returnLine.replace('return ', '').trim()
                    if (returnValue.startsWith('f\'') || returnValue.startsWith('f"')) {
                      // Handle f-strings
                      returnValue = returnValue.slice(2, -1).replace('{name}', argValue)
                      value = value.replace(funcCall[0], `"${returnValue}"`)
                    }
                  }
                }
              }
            }
          }

          // Handle variable references
          if (variables[value]) {
            output += variables[value] + '\n'
          }
          // String literals
          else if ((value.startsWith('"') && value.endsWith('"')) ||
                  (value.startsWith("'") && value.endsWith("'"))) {
            output += value.slice(1, -1) + '\n'
          }
          // Method calls on variables
          else if (value.includes('.')) {
            const parts = value.split('.')
            const varName = parts[0]
            const method = parts[1]

            if (variables[varName] && method === 'upper()') {
              output += variables[varName].toString().toUpperCase() + '\n'
            } else if (variables[varName] && method === 'lower()') {
              output += variables[varName].toString().toLowerCase() + '\n'
            }
          }
          // Function calls like len()
          else if (value.startsWith('len(')) {
            const varName = value.match(/len\(([^)]+)\)/)?.[1]
            if (varName && variables[varName]) {
              output += variables[varName].toString().length + '\n'
            }
          }
          // String concatenation and arithmetic expressions
          else if (/[\+\-\*\/]/.test(value)) {
            try {
              let expr = value
              // Replace variables with their values
              for (const [varName, varValue] of Object.entries(variables)) {
                const regex = new RegExp(`\\b${varName}\\b`, 'g')
                if (typeof varValue === 'string') {
                  expr = expr.replace(regex, `"${varValue}"`)
                } else {
                  expr = expr.replace(regex, String(varValue))
                }
              }
              // eslint-disable-next-line no-eval
              const result = eval(expr)
              output += result + '\n'
            } catch {
              // If eval fails, try simple variable substitution for display
              let result = value
              for (const [varName, varValue] of Object.entries(variables)) {
                result = result.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(varValue))
              }
              output += result + '\n'
            }
          }
          // Numbers
          else if (!isNaN(Number(value))) {
            output += value + '\n'
          }
          // List indexing
          else if (value.includes('[') && value.includes(']')) {
            const match = value.match(/(\w+)\[(\d+)\]/)
            if (match && variables[match[1]] && Array.isArray(variables[match[1]])) {
              output += variables[match[1]][parseInt(match[2])] + '\n'
            }
          }
          else {
            output += value + '\n'
          }
        }
      }
      // Handle variable assignments
      else if (line.includes(' = ')) {
        const parts = line.split(' = ')
        const varName = parts[0].trim()
        const value = parts[1].trim()

        // String values
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          variables[varName] = value.slice(1, -1)
        }
        // Number values
        else if (!isNaN(Number(value))) {
          variables[varName] = parseFloat(value)
        }
        // Arithmetic expressions
        else if (/[\+\-\*\/]/.test(value)) {
          try {
            let expr = value
            for (const [otherVar, otherValue] of Object.entries(variables)) {
              expr = expr.replace(new RegExp(`\\b${otherVar}\\b`, 'g'), String(otherValue))
            }
            // eslint-disable-next-line no-eval
            variables[varName] = eval(expr)
          } catch {
            variables[varName] = value
          }
        }
        // List literals
        else if (value.startsWith('[') && value.endsWith(']')) {
          const items = value.slice(1, -1).split(',').map(item => {
            item = item.trim()
            if ((item.startsWith('"') && item.endsWith('"')) ||
                (item.startsWith("'") && item.endsWith("'"))) {
              return item.slice(1, -1)
            }
            return !isNaN(Number(item)) ? parseFloat(item) : item
          })
          variables[varName] = items
        }
        else {
          variables[varName] = value
        }
      }
      // Handle if statements
      else if (line.startsWith('if ')) {
        const condition = line.replace('if ', '').replace(':', '')
        let conditionMet = false

        if (condition.includes('>=')) {
          const parts = condition.split('>=')
          const left = parts[0].trim()
          const right = parseInt(parts[1].trim())
          const leftValue = variables[left] !== undefined ? variables[left] : parseInt(left)
          conditionMet = leftValue >= right
        }

        if (conditionMet && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim()
          if (nextLine.startsWith('print(')) {
            const content = nextLine.match(/print\(([^)]+)\)/)?.[1].trim()
            if (content && ((content.startsWith('"') && content.endsWith('"')) ||
                (content.startsWith("'") && content.endsWith("'")))) {
              output += content.slice(1, -1) + '\n'
            }
          }
          i++ // Skip the next line as we've processed it
        }
      }
      // Handle for loops
      else if (line.startsWith('for ')) {
        const match = line.match(/for (\w+) in range\((\d+)(?:,\s*(\d+))?\):/)
        if (match) {
          const varName = match[1]
          const start = parseInt(match[2])
          const end = match[3] ? parseInt(match[3]) : start + 1
          const actualStart = match[3] ? start : 1

          for (let j = actualStart; j < end; j++) {
            variables[varName] = j
            if (i + 1 < lines.length) {
              const nextLine = lines[i + 1].trim()
              if (nextLine.startsWith('print(')) {
                const content = nextLine.match(/print\(([^)]+)\)/)?.[1].trim()
                if (content && variables[content]) {
                  output += variables[content] + '\n'
                }
              }
            }
          }
          i++ // Skip the next line
        }
      }
    }

    return {
      output: output.trim() || 'Code executed successfully (no output)',
      success: true
    }
  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }
  }
}

export function compareOutputs(userOutput: string, expectedOutput: string): boolean {
  // Normalize whitespace and line endings
  const normalize = (str: string) => str.trim().replace(/\s+/g, ' ').toLowerCase()

  const userNorm = normalize(userOutput)
  const expectedNorm = normalize(expectedOutput)

  // Exact match (most cases)
  if (userNorm === expectedNorm) return true

  // Numeric comparison for math problems
  if (!isNaN(Number(userNorm)) && !isNaN(Number(expectedNorm))) {
    return Math.abs(parseFloat(userNorm) - parseFloat(expectedNorm)) < 0.001
  }

  // Multiple valid outputs (separated by |)
  if (expectedNorm.includes('|')) {
    return expectedNorm.split('|').some(option =>
      normalize(option) === userNorm
    )
  }

  return false
}

/**
 * Enhanced function execution for test cases with universal grading support
 */
export function executeFunctionWithTestCases(
  code: string,
  testCases: Array<{ input: string; expectedOutput: string }>,
  explicitFunctionName?: string
): TestExecutionResult {
  try {
    let functionName: string;

    // Use explicit function name if provided, otherwise extract from code
    if (explicitFunctionName) {
      functionName = explicitFunctionName;

      // Verify the function exists in the code
      const functionPattern = new RegExp(`def\\s+${explicitFunctionName}\\s*\\([^)]*\\):`);
      if (!functionPattern.test(code)) {
        return {
          success: false,
          passedCount: 0,
          totalCount: testCases.length,
          results: [],
          overallError: `Function '${explicitFunctionName}' not found in your code. Please implement the '${explicitFunctionName}' function.`
        };
      }
    } else {
      // Fallback to auto-detection for backward compatibility
      const functionMatch = code.match(/def\s+(\w+)\s*\([^)]*\):/);
      if (!functionMatch) {
        return {
          success: false,
          passedCount: 0,
          totalCount: testCases.length,
          results: [],
          overallError: "No function definition found. Please define a function."
        };
      }
      functionName = functionMatch[1];
    }
    const results: TestCaseResult[] = [];
    let passedCount = 0;

    for (const testCase of testCases) {
      try {
        // Execute the function with the test case input
        const result = executeFunctionWithInput(code, functionName, testCase.input);

        if (result.success) {
          const passed = compareOutputs(result.output, testCase.expectedOutput);
          if (passed) passedCount++;

          results.push({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: result.output,
            passed,
          });
        } else {
          results.push({
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: '',
            passed: false,
            error: result.error || 'Execution failed'
          });
        }
      } catch (error) {
        results.push({
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      success: true,
      passedCount,
      totalCount: testCases.length,
      results
    };

  } catch (error) {
    return {
      success: false,
      passedCount: 0,
      totalCount: testCases.length,
      results: [],
      overallError: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Execute a specific function with given input
 */
function executeFunctionWithInput(code: string, functionName: string, input: string): PythonExecutionResult {
  try {
    // Parse input parameters
    const params = parseInputParameters(input);

    // Create a modified code that calls the function with the input
    const modifiedCode = `${code}\n\n# Test execution\nresult = ${functionName}(${params})\nprint(result)`;

    // Execute the modified code
    return simulatePythonExecution(modifiedCode);

  } catch (error) {
    return {
      output: '',
      error: error instanceof Error ? error.message : 'Function execution failed',
      success: false
    };
  }
}

/**
 * Parse input parameters from string format
 */
function parseInputParameters(input: string): string {
  try {
    // Handle different input formats:
    // "5" -> 5
    // "hello" -> "hello"
    // "5,3" -> 5, 3
    // '[1,2,3]' -> [1,2,3]

    if (!input.trim()) return '';

    // If it looks like a JSON array or object, return as-is
    if (input.trim().startsWith('[') || input.trim().startsWith('{')) {
      return input;
    }

    // If it contains commas, split and process each part
    if (input.includes(',')) {
      return input.split(',')
        .map(param => parseParameter(param.trim()))
        .join(', ');
    }

    // Single parameter
    return parseParameter(input.trim());

  } catch {
    // If parsing fails, return the input as a string
    return `"${input}"`;
  }
}

/**
 * Parse a single parameter
 */
function parseParameter(param: string): string {
  // Number
  if (!isNaN(Number(param))) {
    return param;
  }

  // Boolean
  if (param.toLowerCase() === 'true' || param.toLowerCase() === 'false') {
    return param.charAt(0).toUpperCase() + param.slice(1).toLowerCase();
  }

  // String (add quotes if not already present)
  if (param.startsWith('"') && param.endsWith('"')) {
    return param;
  }
  if (param.startsWith("'") && param.endsWith("'")) {
    return param;
  }

  // Default to string
  return `"${param}"`;
}