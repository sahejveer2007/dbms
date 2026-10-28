/**
 * =====================================================================
 * DATABASE MANAGEMENT SYSTEMS (DBMS) PROJECT - BACKEND SERVER
 * Technology Stack: Node.js, Express, MySQL (InnoDB), JWT, bcryptjs
 * =====================================================================
 * Key DBMS Concepts Implemented in Backend:
 *  - ACID Transactions with commit & rollback on multi-table registration
 *  - Foreign Key Referential Integrity & Cascades
 *  - Relational Joins (INNER, LEFT) & Aggregations (COUNT, GROUP BY)
 *  - SQL Injection Prevention via Parameterized Prepared Statements
 *  - Unique constraints enforcement handling (ER_DUP_ENTRY)
 * =====================================================================
 */

require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();

// ---------------------------------------------------------------------
// Middleware: CORS & Body Parser
// ---------------------------------------------------------------------
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.static('public'));

const JWT_SECRET = process.env.JWT_SECRET || 'dbms-internship-portal-secret-key-2026';

// ---------------------------------------------------------------------
// Helper Functions & Database Query Wrappers
// ---------------------------------------------------------------------
const query = async (sql, params = []) => {
  const [rows] = await db.query(sql, params);
  return rows;
};

const fail = (message, status = 400) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('API Error:', err.message);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Duplicate entry detected (Email, USN, or Internship Application already exists in database).'
      });
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        error: 'Referential integrity violation: referenced record does not exist in the database.'
      });
    }
    return res.status(err.status || 500).json({ error: err.message || 'Internal Database Server Error' });
  });
};

// ---------------------------------------------------------------------
// Authentication & Role-Based Access Control (RBAC)
// ---------------------------------------------------------------------
const auth = (...allowedRoles) => (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header. Please log in.' });
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Access denied: your role is not authorized for this operation.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
};

const getStudentId = async (req) => {
  const rows = await query('SELECT student_id FROM student_profiles WHERE user_id = ?', [req.user.id]);
  if (!rows.length) fail('Student profile not found for this account.', 404);
  return rows[0].student_id;
};

const getCompanyId = async (req) => {
  const rows = await query('SELECT company_id FROM companies WHERE owner_user_id = ?', [req.user.id]);
  if (!rows.length) fail('Company profile not found for this account.', 404);
  return rows[0].company_id;
};

// ---------------------------------------------------------------------
// System Health & DBMS Inspection APIs
// ---------------------------------------------------------------------
app.get('/api/health', (_, res) => res.json({ ok: true, timestamp: new Date().toISOString() }));

/**
 * DBMS Architecture & Schema Overview API
 * Returns real-time metadata on relational tables, tuples, and constraints.
 */
app.get('/api/dbms/overview', asyncHandler(async (_, res) => {
  try {
    const [userCount] = await query('SELECT COUNT(*) AS count FROM users');
    const [studentCount] = await query('SELECT COUNT(*) AS count FROM student_profiles');
    const [companyCount] = await query('SELECT COUNT(*) AS count FROM companies');
    const [internshipCount] = await query('SELECT COUNT(*) AS count FROM internships');
    const [appCount] = await query('SELECT COUNT(*) AS count FROM applications');

    res.json({
      database_name: 'job_internship_portal',
      engine: 'InnoDB (ACID Compliant)',
      tables: [
        { name: 'users', rows: userCount.count, type: 'Base Entity', pk: 'user_id' },
        { name: 'student_profiles', rows: studentCount.count, type: 'Specialization (1:1 users)', pk: 'student_id', fk: 'user_id' },
        { name: 'companies', rows: companyCount.count, type: 'Specialization (1:1 users)', pk: 'company_id', fk: 'owner_user_id' },
        { name: 'internships', rows: internshipCount.count, type: 'Entity (1:N companies)', pk: 'internship_id', fk: 'company_id' },
        { name: 'applications', rows: appCount.count, type: 'Associative Entity (M:N)', pk: 'application_id', fk: 'internship_id, student_id' }
      ],
      constraints: [
        'users.email UNIQUE',
        'student_profiles.usn UNIQUE',
        'student_profiles.user_id UNIQUE (1:1)',
        'companies.owner_user_id UNIQUE (1:1)',
        'applications (internship_id, student_id) UNIQUE (Composite Candidate Key)',
        'Foreign Keys with ON DELETE CASCADE and ON UPDATE CASCADE'
      ],
      indexes: [
        'idx_users_role (users.role)',
        'idx_users_email (users.email)',
        'idx_student_cgpa (student_profiles.cgpa)',
        'idx_internship_open (internships.status, internships.application_deadline)',
        'idx_app_status (applications.application_status)'
      ]
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch DBMS metadata: ' + err.message });
  }
}));

// ---------------------------------------------------------------------
// AUTHENTICATION ROUTES
// ---------------------------------------------------------------------

/**
 * Register Account with DBMS Transaction (Atomicity & Consistency)
 * Ensures a user account and its respective profile are created together.
 */
app.post('/api/register', asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.full_name || !b.email || !b.password || b.password.length < 6) {
    fail('Full name, valid email, and a password with at least 6 characters are required.');
  }
  if (!['STUDENT', 'COMPANY'].includes(b.role)) {
    fail('Role must be either STUDENT or COMPANY.');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const hashedPassword = await bcrypt.hash(b.password, 10);
    const [userResult] = await conn.query(
      'INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
      [b.full_name.trim(), b.email.trim().toLowerCase(), hashedPassword, b.phone ? b.phone.trim() : null, b.role]
    );
    const newUserId = userResult.insertId;

    if (b.role === 'STUDENT') {
      if (!b.usn) fail('University Seat Number (USN) is required for students.');
      await conn.query(
        `INSERT INTO student_profiles (user_id, usn, college_name, branch, graduation_year, cgpa, skills, resume_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newUserId,
          b.usn.trim().toUpperCase(),
          b.college_name ? b.college_name.trim() : null,
          b.branch ? b.branch.trim() : null,
          b.graduation_year ? parseInt(b.graduation_year, 10) : null,
          b.cgpa ? parseFloat(b.cgpa) : null,
          b.skills ? b.skills.trim() : '',
          b.resume_path ? b.resume_path.trim() : null
        ]
      );
    } else {
      if (!b.company_name) fail('Company name is required for company accounts.');
      await conn.query(
        `INSERT INTO companies (owner_user_id, company_name, website, location, description)
         VALUES (?, ?, ?, ?, ?)`,
        [
          newUserId,
          b.company_name.trim(),
          b.website ? b.website.trim() : null,
          b.location ? b.location.trim() : null,
          b.description ? b.description.trim() : ''
        ]
      );
    }

    await conn.commit();
    res.json({ ok: true, message: 'Registration successful! Please log in.' });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

/**
 * User Login with bcrypt hash comparison & JWT token generation
 */
app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) fail('Email and password are required.');

  const users = await query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  const user = users[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    fail('Invalid email or password.', 401);
  }
  if (!user.is_active) {
    fail('This account has been deactivated by the portal administrator.', 403);
  }

  const token = jwt.sign(
    { id: user.user_id, email: user.email, role: user.role, name: user.full_name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    token,
    user_id: user.user_id,
    name: user.full_name,
    email: user.email,
    role: user.role
  });
}));

// ---------------------------------------------------------------------
// STUDENT MODULE ROUTES
// ---------------------------------------------------------------------

/**
 * Browse Open Internships (with search filter & multi-table JOIN)
 */
app.get('/api/internships', auth(), asyncHandler(async (req, res) => {
  let sql = `
    SELECT
      i.internship_id,
      i.company_id,
      i.title,
      i.description,
      i.required_skills,
      i.location,
      i.work_mode,
      i.stipend,
      i.duration_months,
      i.application_deadline,
      i.status,
      i.posted_at,
      c.company_name,
      c.website AS company_website,
      c.location AS company_location
    FROM internships i
    JOIN companies c ON i.company_id = c.company_id
    WHERE i.status = 'OPEN' AND i.application_deadline >= CURDATE()
  `;

  const params = [];
  const { q: text, mode, location } = req.query;

  if (text && text.trim()) {
    sql += ' AND (i.title LIKE ? OR i.required_skills LIKE ? OR i.description LIKE ?)';
    const term = `%${text.trim()}%`;
    params.push(term, term, term);
  }
  if (mode && mode.trim()) {
    sql += ' AND i.work_mode = ?';
    params.push(mode.trim());
  }
  if (location && location.trim()) {
    sql += ' AND (i.location LIKE ? OR c.location LIKE ?)';
    const loc = `%${location.trim()}%`;
    params.push(loc, loc);
  }

  sql += ' ORDER BY i.posted_at DESC';
  const internships = await query(sql, params);
  res.json(internships);
}));

/**
 * Apply to an Internship (Enforces open status and prevents duplicate application via UNIQUE constraint)
 */
app.post('/api/applications', auth('STUDENT'), asyncHandler(async (req, res) => {
  const { internship_id, cover_letter } = req.body;
  if (!internship_id) fail('Internship ID is required.');

  const student_id = await getStudentId(req);

  // Validate internship is OPEN and active
  const openList = await query(
    "SELECT internship_id FROM internships WHERE internship_id = ? AND status = 'OPEN' AND application_deadline >= CURDATE()",
    [internship_id]
  );
  if (!openList.length) {
    fail('This internship is closed or past its deadline.');
  }

  // Retrieve current student's registered resume link
  const [profile] = await query('SELECT resume_path FROM student_profiles WHERE student_id = ?', [student_id]);

  await query(
    'INSERT INTO applications (internship_id, student_id, cover_letter, resume_path) VALUES (?, ?, ?, ?)',
    [internship_id, student_id, cover_letter ? cover_letter.trim() : null, profile?.resume_path || null]
  );

  res.json({ ok: true, message: 'Application submitted successfully!' });
}));

/**
 * View Current Student's Application History
 */
app.get('/api/my/applications', auth('STUDENT'), asyncHandler(async (req, res) => {
  const student_id = await getStudentId(req);

  const applications = await query(
    `SELECT
       a.application_id,
       a.internship_id,
       i.title,
       i.work_mode,
       i.location,
       i.stipend,
       c.company_name,
       a.cover_letter,
       a.resume_path,
       a.application_status,
       a.applied_at,
       a.updated_at
     FROM applications a
     JOIN internships i ON a.internship_id = i.internship_id
     JOIN companies c ON i.company_id = c.company_id
     WHERE a.student_id = ?
     ORDER BY a.applied_at DESC`,
    [student_id]
  );

  res.json(applications);
}));

/**
 * Get Student Profile Details
 */
app.get('/api/student/profile', auth('STUDENT'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT u.full_name, u.email, u.phone, s.*
     FROM users u
     JOIN student_profiles s ON u.user_id = s.user_id
     WHERE u.user_id = ?`,
    [req.user.id]
  );
  if (!rows.length) fail('Student profile not found.', 404);
  res.json(rows[0]);
}));

/**
 * Update Student Profile
 */
app.put('/api/student/profile', auth('STUDENT'), asyncHandler(async (req, res) => {
  const b = req.body;
  await query(
    `UPDATE student_profiles
     SET college_name = ?, branch = ?, graduation_year = ?, cgpa = ?, skills = ?, resume_path = ?
     WHERE user_id = ?`,
    [b.college_name, b.branch, b.graduation_year || null, b.cgpa || null, b.skills, b.resume_path, req.user.id]
  );
  if (b.full_name || b.phone) {
    await query('UPDATE users SET full_name = COALESCE(?, full_name), phone = ? WHERE user_id = ?', [b.full_name, b.phone, req.user.id]);
  }
  res.json({ ok: true, message: 'Profile updated successfully.' });
}));

// ---------------------------------------------------------------------
// COMPANY MODULE ROUTES
// ---------------------------------------------------------------------

/**
 * Post a New Internship
 */
app.post('/api/internships', auth('COMPANY'), asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.title || !b.description || !b.application_deadline) {
    fail('Title, description, and application deadline are required.');
  }

  const company_id = await getCompanyId(req);

  await query(
    `INSERT INTO internships
       (company_id, title, description, required_skills, location, work_mode, stipend, duration_months, application_deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      company_id,
      b.title.trim(),
      b.description.trim(),
      b.required_skills ? b.required_skills.trim() : '',
      b.location ? b.location.trim() : 'Remote',
      b.work_mode || 'ONSITE',
      b.stipend ? parseFloat(b.stipend) : null,
      b.duration_months ? parseInt(b.duration_months, 10) : null,
      b.application_deadline
    ]
  );

  res.json({ ok: true, message: 'Internship posting published successfully!' });
}));

/**
 * View Internships Posted by Current Company (with application count aggregation)
 */
app.get('/api/company/internships', auth('COMPANY'), asyncHandler(async (req, res) => {
  const company_id = await getCompanyId(req);

  const internships = await query(
    `SELECT
       i.internship_id,
       i.title,
       i.status,
       i.location,
       i.work_mode,
       i.stipend,
       i.duration_months,
       i.application_deadline,
       i.posted_at,
       COUNT(a.application_id) AS total_applications
     FROM internships i
     LEFT JOIN applications a ON i.internship_id = a.internship_id
     WHERE i.company_id = ?
     GROUP BY i.internship_id
     ORDER BY i.posted_at DESC`,
    [company_id]
  );

  res.json(internships);
}));

/**
 * Close an Internship Posting (Restricted to owner company via SQL JOIN ownership check)
 */
app.patch('/api/internships/:id/close', auth('COMPANY'), asyncHandler(async (req, res) => {
  const company_id = await getCompanyId(req);
  const result = await query(
    "UPDATE internships SET status = 'CLOSED' WHERE internship_id = ? AND company_id = ?",
    [req.params.id, company_id]
  );
  if (!result.affectedRows) fail('Internship not found or not owned by your company.', 404);
  res.json({ ok: true, message: 'Internship closed successfully.' });
}));

/**
 * View All Applications for Current Company's Postings
 */
app.get('/api/company/applications', auth('COMPANY'), asyncHandler(async (req, res) => {
  const company_id = await getCompanyId(req);

  const applications = await query(
    `SELECT
       a.application_id,
       a.internship_id,
       i.title AS internship_title,
       u.full_name AS student_name,
       u.email AS student_email,
       u.phone AS student_phone,
       s.usn,
       s.college_name,
       s.branch,
       s.graduation_year,
       s.cgpa,
       s.skills,
       a.resume_path,
       a.cover_letter,
       a.application_status,
       a.applied_at,
       a.updated_at
     FROM applications a
     JOIN student_profiles s ON a.student_id = s.student_id
     JOIN users u ON s.user_id = u.user_id
     JOIN internships i ON a.internship_id = i.internship_id
     WHERE i.company_id = ?
     ORDER BY a.applied_at DESC`,
    [company_id]
  );

  res.json(applications);
}));

/**
 * Update Application Status (APPLIED, SHORTLISTED, REJECTED, SELECTED)
 * Validates company ownership in SQL query.
 */
app.patch('/api/applications/:id', auth('COMPANY'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['APPLIED', 'SHORTLISTED', 'REJECTED', 'SELECTED'].includes(status)) {
    fail('Invalid application status. Allowed: APPLIED, SHORTLISTED, REJECTED, SELECTED.');
  }

  const company_id = await getCompanyId(req);

  const [result] = await db.query(
    `UPDATE applications a
     JOIN internships i ON a.internship_id = i.internship_id
     SET a.application_status = ?
     WHERE a.application_id = ? AND i.company_id = ?`,
    [status, req.params.id, company_id]
  );

  if (!result.affectedRows) {
    fail('Application not found or you are not authorized to update it.', 404);
  }

  res.json({ ok: true, message: `Application status updated to ${status}.` });
}));

// ---------------------------------------------------------------------
// ADMIN MODULE ROUTES
// ---------------------------------------------------------------------

/**
 * Admin System Analytics
 */
app.get('/api/admin/stats', auth('ADMIN'), asyncHandler(async (_, res) => {
  const [counts] = await query(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') AS total_students,
      (SELECT COUNT(*) FROM companies) AS total_companies,
      (SELECT COUNT(*) FROM internships) AS total_internships,
      (SELECT COUNT(*) FROM internships WHERE status = 'OPEN') AS active_internships,
      (SELECT COUNT(*) FROM applications) AS total_applications,
      (SELECT COUNT(*) FROM applications WHERE application_status = 'SELECTED') AS placed_applications
  `);
  res.json(counts);
}));

/**
 * View All Users
 */
app.get('/api/admin/users', auth('ADMIN'), asyncHandler(async (_, res) => {
  const users = await query(
    'SELECT user_id, full_name, email, phone, role, is_active, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(users);
}));

/**
 * Toggle User Active Status (Soft disable/enable)
 */
app.patch('/api/admin/users/:id/toggle', auth('ADMIN'), asyncHandler(async (req, res) => {
  await query("UPDATE users SET is_active = NOT is_active WHERE user_id = ? AND role <> 'ADMIN'", [req.params.id]);
  res.json({ ok: true, message: 'User status updated successfully.' });
}));

/**
 * View All Registered Companies
 */
app.get('/api/admin/companies', auth('ADMIN'), asyncHandler(async (_, res) => {
  const companies = await query(
    `SELECT c.company_id, c.company_name, c.location, c.website, c.description, u.email, u.full_name AS contact_person, u.is_active
     FROM companies c
     JOIN users u ON c.owner_user_id = u.user_id
     ORDER BY c.company_name ASC`
  );
  res.json(companies);
}));

/**
 * View All Internships (Across all companies)
 */
app.get('/api/admin/internships', auth('ADMIN'), asyncHandler(async (_, res) => {
  const internships = await query(
    `SELECT
       i.internship_id,
       i.title,
       c.company_name,
       i.location,
       i.work_mode,
       i.stipend,
       i.status,
       i.application_deadline,
       i.posted_at,
       COUNT(a.application_id) AS total_applications
     FROM internships i
     JOIN companies c ON i.company_id = c.company_id
     LEFT JOIN applications a ON i.internship_id = a.internship_id
     GROUP BY i.internship_id
     ORDER BY i.posted_at DESC`
  );
  res.json(internships);
}));

/**
 * Delete an Internship Posting (Cascades to related applications)
 */
app.delete('/api/admin/internships/:id', auth('ADMIN'), asyncHandler(async (req, res) => {
  await query('DELETE FROM internships WHERE internship_id = ?', [req.params.id]);
  res.json({ ok: true, message: 'Internship posting deleted.' });
}));

/**
 * View All Applications System-Wide
 */
app.get('/api/admin/applications', auth('ADMIN'), asyncHandler(async (_, res) => {
  const applications = await query(
    `SELECT
       a.application_id,
       u.full_name AS student_name,
       s.usn,
       s.cgpa,
       i.title AS internship_title,
       c.company_name,
       a.application_status,
       a.applied_at
     FROM applications a
     JOIN student_profiles s ON a.student_id = s.student_id
     JOIN users u ON s.user_id = u.user_id
     JOIN internships i ON a.internship_id = i.internship_id
     JOIN companies c ON i.company_id = c.company_id
     ORDER BY a.applied_at DESC`
  );
  res.json(applications);
}));

// ---------------------------------------------------------------------
// Server Startup & Database Connection Test
// ---------------------------------------------------------------------
const PORT = process.env.PORT || 3000;

db.query('SELECT 1')
  .then(() => {
    console.log('✓ MySQL Relational Database connected successfully.');
  })
  .catch((err) => {
    console.log('\n[!] MySQL Connection Notice: ' + err.message);
    console.log('[!] Ensure MySQL is running, check .env credentials, and run "npm run setup" if database is uninitialized.\n');
  });

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  DBMS JOB & INTERNSHIP PORTAL`);
  console.log(`  Running on: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
