# Super Admin vs Professor - Implementation Guide

## 🎯 Overview

The platform now has **two types of admin users**:

| Role | Username | Password | Can Bulk Import/Delete | Can Create Subjects | Can Enroll Students |
|------|----------|----------|------------------------|---------------------|---------------------|
| **Super Admin** | `admin` | `123456` | ✅ Yes | ✅ Yes | ✅ Yes |
| **Professor** | `professor` | `123456` | ❌ No | ✅ Yes | ✅ Yes (existing only) |

## 🔐 Key Differences

### Super Admin Powers
- ✅ Bulk import students from CSV
- ✅ Bulk delete students
- ✅ Create subjects
- ✅ Enroll students in subjects
- ✅ Create quests for subjects
- ✅ Full access to all features

### Professor Limitations
- ❌ Cannot bulk import students
- ❌ Cannot bulk delete students
- ✅ Can create subjects
- ✅ Can enroll **existing** students (imported by super admin)
- ✅ Can create quests for their subjects
- ✅ Can manage questions and assignments

## 📋 Typical Workflow

### Step 1: Super Admin - Bulk Import Students
```
1. Login as super admin (admin/123456)
2. Go to /admin/students
3. Click "Bulk Upload Students" button
4. Upload CSV with all students
5. Students are added to the platform
```

### Step 2: Professor - Create Subject
```
1. Login as professor (professor/123456)
2. Go to /admin/subjects/create
3. Create subject: "Data Structures PGDM-A"
4. Subject is created
```

### Step 3: Professor - Enroll Students
```
1. Go to /admin/subjects/[id]/enroll
2. Search for students (only those imported by super admin)
3. Select students to enroll
4. Students enrolled in subject
```

### Step 4: Professor - Create Quests
```
1. Go to /admin/quests
2. Click "Create Quest"
3. Select subject from dropdown (only shows their subjects)
4. Create quest
5. Add questions
```

## 🔄 Student Enrollment Flow

### Old Flow (Before)
```
Bulk CSV Import → All students can see all quests
```

### New Flow (After)
```
Super Admin: Bulk CSV Import → Students added to platform
     ↓
Professor: Create Subject → Enroll students → Create quests
     ↓
Students: Only see quests from enrolled subjects
```

## 🗃️ Database Changes

### Added Column
```sql
ALTER TABLE users
  ADD COLUMN is_super_admin BOOLEAN DEFAULT false;
```

### Super Admin Check
```typescript
// In auth.ts - UserPayload interface
export interface UserPayload {
  id: string
  username: string
  email: string
  role: 'student' | 'admin'
  is_super_admin?: boolean // NEW
  [key: string]: any
}
```

### UI Check (Students Page)
```typescript
// Fetch user session
const [isSuperAdmin, setIsSuperAdmin] = useState(false)

useEffect(() => {
  fetch('/api/auth/session')
    .then(res => res.json())
    .then(data => {
      if (data.success && data.user) {
        setIsSuperAdmin(data.user.is_super_admin || false)
      }
    })
}, [])

// Conditionally render buttons
{isSuperAdmin && (
  <div>
    <button>Bulk Delete Students</button>
    <a href="/admin/students/bulk-upload">Bulk Upload</a>
  </div>
)}

{!isSuperAdmin && (
  <div>
    ℹ️ Professors can enroll existing students in subjects.
    Contact super admin for bulk student import.
  </div>
)}
```

## 🚀 Quick Start

### Run the Reset Script
```sql
-- In Supabase SQL Editor, run:
database/complete_reset.sql
```

This will:
1. Delete all students, quests, questions, progress
2. Preserve achievements (your hard work!)
3. Add `is_super_admin` column
4. Create two admin users:
   - admin (super admin, is_super_admin=true)
   - professor (regular professor, is_super_admin=false)

### Login Credentials

**Super Admin:**
```
URL: http://localhost:3000
Username: admin
Password: 123456
```

**Professor:**
```
URL: http://localhost:3000
Username: professor
Password: 123456
```

**Student (auto-register):**
```
URL: http://localhost:3000
Username: [any username]
Email: [any email]
Type: Student
```

## 📊 Complete Workflow Example

### Scenario: Setup Course for 50 PGDM Students

#### 1. Super Admin: Bulk Import Students
```csv
username,email,roll_number,batch,course,section,department
student1,s1@mail.com,2024001,2024-2026,PGDM,A,Management
student2,s2@mail.com,2024002,2024-2026,PGDM,A,Management
...
student50,s50@mail.com,2024050,2024-2026,PGDM,A,Management
```

**Upload at**: `/admin/students/bulk-upload`

#### 2. Professor: Create Subjects
```
Subject 1:
- Name: "Python Fundamentals"
- Code: PY101
- Batch: 2024-2026
- Course: PGDM
- Section: A
- Is Elective: No

Subject 2:
- Name: "Advanced Machine Learning"
- Code: ML301
- Batch: 2024-2026
- Course: PGDM
- Is Elective: Yes (no section)
```

#### 3. Professor: Enroll Students
```
For "Python Fundamentals":
- Go to /admin/subjects/[id]/enroll
- Click "Select All from Section A" → All 50 students
- Enroll

For "Advanced Machine Learning" (Elective):
- Go to /admin/subjects/[id]/enroll
- Search and select 20 interested students
- Enroll
```

#### 4. Professor: Create Quests
```
Quest 1 (Python Fundamentals):
- Subject: Select "Python Fundamentals" from dropdown
- Title: "Variables and Data Types"
- Difficulty: Beginner
- Add 5 questions

Quest 2 (Machine Learning):
- Subject: Select "Advanced Machine Learning"
- Title: "Introduction to Neural Networks"
- Difficulty: Advanced
- Add 3 questions
```

#### 5. Students Login
```
Student 1 (enrolled in both):
- Sees Quest 1 from "Python Fundamentals"
- Sees Quest 2 from "Advanced Machine Learning"

Student 51 (only enrolled in Python):
- Sees Quest 1 from "Python Fundamentals"
- Does NOT see Quest 2 (not enrolled in ML)
```

## 🧪 Testing Checklist

- [ ] Run `database/complete_reset.sql` in Supabase
- [ ] Login as super admin (admin/123456)
- [ ] Verify "Bulk Upload" and "Bulk Delete" buttons visible
- [ ] Logout and login as professor (professor/123456)
- [ ] Verify "Bulk Upload" and "Bulk Delete" buttons hidden
- [ ] Verify info message: "Professors can enroll existing students..."
- [ ] As super admin: Bulk import 3 test students
- [ ] As professor: Create subject "Test Subject"
- [ ] As professor: Enroll the 3 imported students
- [ ] As professor: Create quest linked to "Test Subject"
- [ ] As student: Login and verify quest visible
- [ ] Create another subject, don't enroll student
- [ ] Create quest for new subject
- [ ] As student: Verify new quest NOT visible

## 🔧 Technical Implementation Files

### Modified Files:
1. **database/complete_reset.sql** - Adds is_super_admin column, creates both users
2. **src/lib/auth.ts** - Updated UserPayload interface, authenticateAdmin returns is_super_admin
3. **src/app/admin/students/page.tsx** - Conditionally shows bulk buttons based on is_super_admin

### New Files:
4. **database/add_super_admin_role.sql** - Standalone script to add role to existing DB

## ⚠️ Important Notes

### CSV Import Matching
When professor enrolls students by uploading CSV in `/admin/subjects/[id]/enroll`:
- CSV must have email/roll_number/username
- System matches against students in database
- Only students previously imported by super admin can be enrolled
- No new students are created during subject enrollment

### Security
- Both admin types have role='admin' in database
- Differentiation is via `is_super_admin` boolean
- Middleware still checks for role='admin'
- UI-level protection for bulk import/delete

### Backward Compatibility
- Existing admin users default to `is_super_admin=false` (professors)
- Run migration SQL to make existing admin a super admin
- All existing functionality preserved

## 🆘 Troubleshooting

### "Bulk buttons not showing for admin"
**Solution:** Check if admin has `is_super_admin=true` in database:
```sql
SELECT username, is_super_admin FROM users WHERE role='admin';
UPDATE users SET is_super_admin=true WHERE username='admin';
```

### "Professor sees bulk upload button"
**Solution:** Verify session API returns is_super_admin:
```bash
curl -b cookies.txt http://localhost:3000/api/auth/session
```

### "Cannot enroll students in subject"
**Solution:** Ensure students exist in database (imported by super admin first)

## ✅ Summary

| Feature | Super Admin | Professor |
|---------|-------------|-----------|
| Login Credentials | admin/123456 | professor/123456 |
| Bulk Import Students | ✅ | ❌ |
| Bulk Delete Students | ✅ | ❌ |
| Create Subjects | ✅ | ✅ |
| Enroll Existing Students | ✅ | ✅ |
| Create Quests | ✅ | ✅ |
| Manage Questions | ✅ | ✅ |
| View Analytics | ✅ | ✅ |

**Build Status:** ✅ PASSED (no errors)

You're ready to use the system with role separation!
