#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔍 [DEBUG BUILD] Starting comprehensive build analysis...')
console.log('=====================================')

// 1. Environment info
console.log('📋 ENVIRONMENT INFO:')
console.log('- Node version:', process.version)
console.log('- Platform:', process.platform)
console.log('- Architecture:', process.arch)
console.log('- Working directory:', process.cwd())
console.log('- NODE_ENV:', process.env.NODE_ENV)
console.log('- VERCEL_ENV:', process.env.VERCEL_ENV)
console.log('')

// 2. Check package.json
console.log('📦 PACKAGE.JSON ANALYSIS:')
try {
  const packagePath = path.join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

  console.log('- Package name:', packageJson.name)
  console.log('- Version:', packageJson.version)
  console.log('- Dependencies count:', Object.keys(packageJson.dependencies || {}).length)
  console.log('- DevDependencies count:', Object.keys(packageJson.devDependencies || {}).length)

  console.log('- TailwindCSS in dependencies:', !!packageJson.dependencies?.tailwindcss)
  console.log('- TailwindCSS in devDependencies:', !!packageJson.devDependencies?.tailwindcss)
  console.log('- PostCSS in dependencies:', !!packageJson.dependencies?.postcss)
  console.log('- PostCSS in devDependencies:', !!packageJson.devDependencies?.postcss)
} catch (error) {
  console.error('❌ Failed to read package.json:', error.message)
}
console.log('')

// 3. Check admin components directory
console.log('🏗️ ADMIN COMPONENTS ANALYSIS:')
const adminPath = path.join(process.cwd(), 'src', 'components', 'admin')
console.log('- Admin components path:', adminPath)
console.log('- Directory exists:', fs.existsSync(adminPath))

if (fs.existsSync(adminPath)) {
  try {
    const files = fs.readdirSync(adminPath)
    console.log('- Files found:', files.length)
    files.forEach(file => {
      const filePath = path.join(adminPath, file)
      const stats = fs.statSync(filePath)
      console.log(`  - ${file} (${stats.size} bytes, modified: ${stats.mtime.toISOString()})`)
    })
  } catch (error) {
    console.error('❌ Failed to read admin directory:', error.message)
  }
}
console.log('')

// 4. Test module resolution
console.log('🔧 MODULE RESOLUTION TESTS:')
const testModules = [
  '@/components/admin/AdminHeader',
  '@/components/admin/StatsOverview',
  '@/components/admin/RecentActivityPanel',
  '@/components/admin/TopPerformersPanel',
  'tailwindcss',
  'postcss',
  'next',
  'react',
  'typescript',
  'eslint'
]

testModules.forEach(moduleName => {
  try {
    const resolved = require.resolve(moduleName)
    console.log(`✅ ${moduleName} -> ${resolved}`)
  } catch (error) {
    console.log(`❌ ${moduleName} -> ${error.message}`)
  }
})
console.log('')

// 5. Check TypeScript paths
console.log('🛠️ TYPESCRIPT CONFIG:')
try {
  const tsconfigPath = path.join(process.cwd(), 'tsconfig.json')
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
    console.log('- baseUrl:', tsconfig.compilerOptions?.baseUrl)
    console.log('- paths:', JSON.stringify(tsconfig.compilerOptions?.paths, null, 2))
  } else {
    console.log('- tsconfig.json not found')
  }
} catch (error) {
  console.error('❌ Failed to read tsconfig.json:', error.message)
}
console.log('')

// 6. Check Next.js config
console.log('⚙️ NEXT.JS CONFIG:')
try {
  const nextConfigPath = path.join(process.cwd(), 'next.config.js')
  if (fs.existsSync(nextConfigPath)) {
    console.log('- next.config.js exists')
    // Don't try to require it as it might have build-time dependencies
  } else {
    console.log('- next.config.js not found')
  }
} catch (error) {
  console.error('❌ Failed to check next.config.js:', error.message)
}

console.log('')
console.log('🔍 [DEBUG BUILD] Analysis complete!')
console.log('=====================================')