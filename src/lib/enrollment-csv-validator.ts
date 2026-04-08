import Papa from 'papaparse'

export interface EnrollmentCSVRow {
  email: string
}

export interface EnrollmentValidationError {
  row: number
  field: string
  message: string
  value?: string
}

export interface EnrollmentCSVValidationResult {
  valid: boolean
  emails: string[]
  errors: EnrollmentValidationError[]
  duplicateEmails: string[]
}

const REQUIRED_HEADERS = ['email']

// Simple email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export function parseEnrollmentCSV(csvContent: string): Promise<EnrollmentCSVValidationResult> {
  return new Promise((resolve) => {
    Papa.parse<EnrollmentCSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const validationResult = validateEnrollmentCSVData(results.data, results.meta.fields || [])
        resolve(validationResult)
      },
      error: (error: any) => {
        resolve({
          valid: false,
          emails: [],
          errors: [{
            row: 0,
            field: 'file',
            message: `CSV parsing error: ${error.message}`
          }],
          duplicateEmails: []
        })
      }
    })
  })
}

function validateEnrollmentCSVData(data: any[], headers: string[]): EnrollmentCSVValidationResult {
  const errors: EnrollmentValidationError[] = []
  const validEmails: string[] = []
  const emailSet = new Set<string>()
  const duplicateEmails = new Set<string>()

  // Check for missing required headers
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase())
  const missingHeaders = REQUIRED_HEADERS.filter(
    required => !normalizedHeaders.includes(required)
  )

  if (missingHeaders.length > 0) {
    errors.push({
      row: 0,
      field: 'headers',
      message: `Missing required header: ${missingHeaders.join(', ')}`
    })
    return {
      valid: false,
      emails: [],
      errors,
      duplicateEmails: []
    }
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowNumber = index + 2 // +2 because: +1 for 1-based indexing, +1 for header row
    const rowErrors: EnrollmentValidationError[] = []

    // Trim email
    const email = typeof row.email === 'string' ? row.email.trim() : row.email

    // Validate email is not empty
    if (!email || email === '') {
      rowErrors.push({
        row: rowNumber,
        field: 'email',
        message: 'Email is required',
        value: email
      })
      errors.push(...rowErrors)
      return
    }

    // Validate email format
    if (!validateEmail(email)) {
      rowErrors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format',
        value: email
      })
    }

    // Check for duplicate emails within CSV
    const emailLower = email.toLowerCase()
    if (emailSet.has(emailLower)) {
      duplicateEmails.add(emailLower)
      rowErrors.push({
        row: rowNumber,
        field: 'email',
        message: 'Duplicate email found in CSV',
        value: email
      })
    } else {
      emailSet.add(emailLower)
    }

    // Add errors to main list
    errors.push(...rowErrors)

    // If no errors for this row, add to valid emails
    if (rowErrors.length === 0) {
      validEmails.push(emailLower)
    }
  })

  return {
    valid: errors.length === 0,
    emails: validEmails,
    errors,
    duplicateEmails: Array.from(duplicateEmails)
  }
}

export function generateEnrollmentSampleCSV(): string {
  const headers = 'email'
  const sampleRows = [
    'student1@example.com',
    'student2@example.com',
    'student3@example.com'
  ]

  return [headers, ...sampleRows].join('\n')
}
