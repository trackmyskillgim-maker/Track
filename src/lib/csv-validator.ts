import Papa from 'papaparse'

export interface StudentCSVRow {
  name: string
  email: string
  password: string
  batch: string
  course: string
  section: string
  roll_number: string
}

export interface ValidationError {
  row: number
  field: string
  message: string
  value?: string
}

export interface CSVValidationResult {
  valid: boolean
  data: StudentCSVRow[]
  errors: ValidationError[]
  duplicateEmails: string[]
}

const REQUIRED_HEADERS = [
  'name',
  'email',
  'password',
  'batch',
  'course',
  'section',
  'roll_number'
]

const VALID_COURSES = ['PGDM', 'BDA', 'HCM', 'BIFS']
const VALID_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']

// Batch format: YYYY-YYYY (e.g., 2018-2020)
const BATCH_REGEX = /^\d{4}-\d{4}$/

// Simple email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateBatchFormat(batch: string): boolean {
  if (!BATCH_REGEX.test(batch)) return false

  const [startYear, endYear] = batch.split('-').map(Number)

  // End year should be greater than start year
  if (endYear <= startYear) return false

  // Reasonable year range (e.g., between 2000 and 2050)
  if (startYear < 2000 || endYear > 2050) return false

  return true
}

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export function validateCourse(course: string): boolean {
  return VALID_COURSES.includes(course.toUpperCase())
}

export function validateSection(section: string): boolean {
  return VALID_SECTIONS.includes(section.toUpperCase())
}

export function parseCSV(csvContent: string): Promise<CSVValidationResult> {
  return new Promise((resolve) => {
    Papa.parse<StudentCSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        const validationResult = validateCSVData(results.data, results.meta.fields || [])
        resolve(validationResult)
      },
      error: (error: any) => {
        resolve({
          valid: false,
          data: [],
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

function validateCSVData(data: any[], headers: string[]): CSVValidationResult {
  const errors: ValidationError[] = []
  const validData: StudentCSVRow[] = []
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
      message: `Missing required headers: ${missingHeaders.join(', ')}`
    })
    return {
      valid: false,
      data: [],
      errors,
      duplicateEmails: []
    }
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowNumber = index + 2 // +2 because: +1 for 1-based indexing, +1 for header row
    const rowErrors: ValidationError[] = []

    // Trim all string values
    const trimmedRow: any = {}
    Object.keys(row).forEach(key => {
      trimmedRow[key] = typeof row[key] === 'string' ? row[key].trim() : row[key]
    })

    // Validate required fields are not empty
    REQUIRED_HEADERS.forEach(field => {
      if (!trimmedRow[field] || trimmedRow[field] === '') {
        rowErrors.push({
          row: rowNumber,
          field,
          message: `${field} is required`,
          value: trimmedRow[field]
        })
      }
    })

    // If basic required fields are missing, skip further validation
    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
      return
    }

    // Validate email format
    if (!validateEmail(trimmedRow.email)) {
      rowErrors.push({
        row: rowNumber,
        field: 'email',
        message: 'Invalid email format',
        value: trimmedRow.email
      })
    }

    // Check for duplicate emails within CSV
    const emailLower = trimmedRow.email.toLowerCase()
    if (emailSet.has(emailLower)) {
      duplicateEmails.add(emailLower)
      rowErrors.push({
        row: rowNumber,
        field: 'email',
        message: 'Duplicate email found in CSV',
        value: trimmedRow.email
      })
    } else {
      emailSet.add(emailLower)
    }

    // Validate batch format
    if (!validateBatchFormat(trimmedRow.batch)) {
      rowErrors.push({
        row: rowNumber,
        field: 'batch',
        message: 'Invalid batch format. Must be YYYY-YYYY (e.g., 2018-2020)',
        value: trimmedRow.batch
      })
    }

    // Validate course
    if (!validateCourse(trimmedRow.course)) {
      rowErrors.push({
        row: rowNumber,
        field: 'course',
        message: `Invalid course. Must be one of: ${VALID_COURSES.join(', ')}`,
        value: trimmedRow.course
      })
    }

    // Validate section
    if (!validateSection(trimmedRow.section)) {
      rowErrors.push({
        row: rowNumber,
        field: 'section',
        message: `Invalid section. Must be one of: ${VALID_SECTIONS.join(', ')}`,
        value: trimmedRow.section
      })
    }

    // Validate password length (minimum 6 characters)
    if (trimmedRow.password.length < 6) {
      rowErrors.push({
        row: rowNumber,
        field: 'password',
        message: 'Password must be at least 6 characters',
        value: '***'
      })
    }

    // Add errors to main list
    errors.push(...rowErrors)

    // If no errors for this row, add to valid data
    if (rowErrors.length === 0) {
      validData.push({
        name: trimmedRow.name,
        email: trimmedRow.email.toLowerCase(),
        password: trimmedRow.password,
        batch: trimmedRow.batch,
        course: trimmedRow.course.toUpperCase(),
        section: trimmedRow.section.toUpperCase(),
        roll_number: trimmedRow.roll_number
      })
    }
  })

  return {
    valid: errors.length === 0,
    data: validData,
    errors,
    duplicateEmails: Array.from(duplicateEmails)
  }
}

export function generateSampleCSV(): string {
  const headers = REQUIRED_HEADERS.join(',')
  const sampleRows = [
    'John Doe,john.doe@example.com,password123,2018-2020,PGDM,A,PG001',
    'Jane Smith,jane.smith@example.com,secure456,2019-2021,BDA,B,BD002',
    'Alice Johnson,alice.j@example.com,alice789,2020-2022,HCM,C,HC103'
  ]

  return [headers, ...sampleRows].join('\n')
}
