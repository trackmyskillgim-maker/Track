/**
 * Pure AI Test Script Executor with Pyodide
 * Universal solution for ANY Python question type - no parsing complexity
 */

// Global pyodide instance
let pyodideInstance: any = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// Test case structure - PURE AI SCRIPT FORMAT
export interface MVPTestCase {
  testScript: string;  // AI-generated complete Python test script
  description?: string;
  is_visible?: boolean;
}

// Test execution result - PURE AI FORMAT
export interface MVPTestResult {
  testCase: number;
  description: string;
  passed: boolean;
  error: string | null;
  executionTime?: number;
  scriptResult?: any; // Optional: Any result data from the AI script
}

export interface MVPExecutionResults {
  results: MVPTestResult[];
  passedCount: number;
  totalCount: number;
  success: boolean;
  overallError?: string;
}

/**
 * Initialize Pyodide
 */
export async function initializePyodide(): Promise<boolean> {
  if (pyodideInstance) {
    return true;
  }

  if (isInitializing && initializationPromise) {
    await initializationPromise;
    return !!pyodideInstance;
  }

  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing && !pyodideInstance) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return !!pyodideInstance;
  }

  isInitializing = true;

  try {
    initializationPromise = (async () => {
      console.log('🐍 Initializing Pyodide...');

      // Load Pyodide script if not already loaded
      if (!window.loadPyodide) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // Initialize Pyodide instance
      pyodideInstance = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
      });

      // Install common packages that might be needed
      console.log('📦 Installing common Python packages...');
      try {
        await pyodideInstance.loadPackage(['numpy', 'pandas', 'matplotlib']);
        console.log('✅ Common packages installed');
      } catch (error) {
        console.warn('⚠️ Some packages may not be available:', error);
      }

      console.log('✅ Pyodide initialized successfully!');
    })();

    await initializationPromise;
    return true;

  } catch (error) {
    console.error('❌ Failed to initialize Pyodide:', error);
    return false;
  } finally {
    isInitializing = false;
  }
}

/**
 * Execute Python tests using AI-generated test scripts - UNIVERSAL SOLUTION
 */
export async function executePyodideTests(
  code: string,
  functionName: string,
  testCases: MVPTestCase[]
): Promise<MVPExecutionResults> {
  if (!pyodideInstance) {
    const initialized = await initializePyodide();
    if (!initialized) {
      return {
        success: false,
        results: [],
        passedCount: 0,
        totalCount: testCases.length,
        overallError: 'Failed to initialize Python environment'
      };
    }
  }

  const results: MVPTestResult[] = [];
  let passedCount = 0;

  // Execute AI-generated test scripts
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    const startTime = Date.now();

    try {
      console.log(`🤖 Executing AI test script for test case ${i + 1}`);

      // Execute the user's code first
      pyodideInstance.runPython(code);

      // Execute the AI-generated test script directly
      // The script should define a run_test() function and set 'passed' variable
      pyodideInstance.runPython(testCase.testScript);

      // Get the result from the 'passed' variable set by the script
      const passed = pyodideInstance.runPython('passed');

      // Optionally get any additional result data from the script
      let scriptResult = null;
      try {
        scriptResult = pyodideInstance.runPython('locals().get("result", None)');
      } catch {
        // No additional result data available
      }

      results.push({
        testCase: i + 1,
        description: testCase.description || `AI Test Script ${i + 1}`,
        passed: Boolean(passed),
        error: null,
        executionTime: Date.now() - startTime,
        scriptResult: scriptResult,
        // Backward compatibility fields for frontend
        inputs: [], // Empty for AI scripts
        expectedOutput: 'AI_SCRIPT_RESULT',
        actualOutput: passed ? 'PASSED' : 'FAILED'
      } as any);

      if (passed) passedCount++;

    } catch (error) {
      console.error(`❌ Test case ${i + 1} failed:`, error);

      results.push({
        testCase: i + 1,
        description: testCase.description || `Test case ${i + 1}`,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        // Backward compatibility fields for frontend
        inputs: [], // Empty for AI scripts
        expectedOutput: 'AI_SCRIPT_RESULT',
        actualOutput: 'ERROR'
      } as any);
    }
  }

  return {
    success: true,
    results: results,
    passedCount: passedCount,
    totalCount: testCases.length
  };
}

/**
 * Check if Pyodide is ready for execution
 */
export function isPyodideReady(): boolean {
  return !!pyodideInstance && !isInitializing;
}

/**
 * Clean up Pyodide instance
 */
export function cleanupPyodide(): void {
  pyodideInstance = null;
  isInitializing = false;
  initializationPromise = null;
}

// For backward compatibility - ensure window.loadPyodide exists
declare global {
  interface Window {
    loadPyodide: any;
  }
}