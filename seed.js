// =====================================================================
// SEED SCRIPT: DEMO DATA FOR DBMS INTERNSHIP PORTAL
// Default password for all seed accounts: Pass@123
// =====================================================================
require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  console.log('Seeding DBMS Internship Portal demo data...');
  const hash = await bcrypt.hash('Pass@123', 10);

  // 1. ADMIN ACCOUNT
  await db.query(
    "INSERT INTO users (full_name, email, password_hash, role) VALUES ('System Administrator', 'admin@portal.com', ?, 'ADMIN')",
    [hash]
  );

  // 2. COMPANY ACCOUNTS & PROFILES
  // Company 1: TechNova Data Solutions
  const [c1User] = await db.query(
    "INSERT INTO users (full_name, email, password_hash, phone, role) VALUES ('TechNova HR Desk', 'hr@technova.com', ?, '9876500001', 'COMPANY')",
    [hash]
  );
  const [c1] = await db.query(
    "INSERT INTO companies (owner_user_id, company_name, website, location, description) VALUES (?, 'TechNova Data Solutions', 'https://technova.example', 'Bengaluru, Karnataka', 'Specializing in high-throughput enterprise database engines, MySQL clustering, and scalable backend data microservices.')",
    [c1User.insertId]
  );

  // Company 2: Oracle Cloud Data Labs
  const [c2User] = await db.query(
    "INSERT INTO users (full_name, email, password_hash, phone, role) VALUES ('Oracle Talent Team', 'hr@oraclecloud.com', ?, '9876500002', 'COMPANY')",
    [hash]
  );
  const [c2] = await db.query(
    "INSERT INTO companies (owner_user_id, company_name, website, location, description) VALUES (?, 'Oracle Cloud Data Labs', 'https://oraclelabs.example', 'Bengaluru, Karnataka', 'Pioneers in relational database management systems, autonomous cloud databases, and mission-critical SQL query processors.')",
    [c2User.insertId]
  );

  // Company 3: PostgreSys Technologies
  const [c3User] = await db.query(
    "INSERT INTO users (full_name, email, password_hash, phone, role) VALUES ('PostgreSys Hiring Lead', 'hr@postgresys.com', ?, '9876500003', 'COMPANY')",
    [hash]
  );
  const [c3] = await db.query(
    "INSERT INTO companies (owner_user_id, company_name, website, location, description) VALUES (?, 'PostgreSys Technologies', 'https://postgresys.example', 'Pune, Maharashtra', 'Open-source relational database infrastructure, ACID transaction engines, query execution planner research, and data replication systems.')",
    [c3User.insertId]
  );

  // 3. STUDENT ACCOUNTS & PROFILES
  // Student 1: Rohit Biradar
  const [s1User] = await db.query(
    "INSERT INTO users (full_name, email, password_hash, phone, role) VALUES ('Rohit Biradar', 'rohit@student.com', ?, '9876543210', 'STUDENT')",
    [hash]
  );
  const [s1] = await db.query(
    "INSERT INTO student_profiles (user_id, usn, college_name, branch, graduation_year, cgpa, skills, resume_path) VALUES (?, '1AB23CS001', 'BMS College of Engineering', 'Computer Science & Engineering', 2027, 8.75, 'MySQL, Relational Schema Design, SQL Query Optimization, Python, C++, Normalization (3NF)', 'https://drive.google.com/file/d/rohit_resume_dbms/view')",
    [s1User.insertId]
  );

  // Student 2: Ananya Sharma
  const [s2User] = await db.query(
    "INSERT INTO users (full_name, email, password_hash, phone, role) VALUES ('Ananya Sharma', 'ananya@student.com', ?, '9876543211', 'STUDENT')",
    [hash]
  );
  const [s2] = await db.query(
    "INSERT INTO student_profiles (user_id, usn, college_name, branch, graduation_year, cgpa, skills, resume_path) VALUES (?, '1AB23CS042', 'R.V. College of Engineering', 'Information Science & Engineering', 2026, 9.20, 'PostgreSQL, Database Administration (DBA), Indexing Strategies, Stored Procedures, Java, Spring Boot', 'https://drive.google.com/file/d/ananya_resume_dbms/view')",
    [s2User.insertId]
  );

  // Student 3: Karthik Verma
  const [s3User] = await db.query(
    "INSERT INTO users (full_name, email, password_hash, phone, role) VALUES ('Karthik Verma', 'karthik@student.com', ?, '9876543212', 'STUDENT')",
    [hash]
  );
  const [s3] = await db.query(
    "INSERT INTO student_profiles (user_id, usn, college_name, branch, graduation_year, cgpa, skills, resume_path) VALUES (?, '1AB23CS088', 'PES University', 'Data Science & Engineering', 2027, 8.40, 'SQL, Relational Algebra, ETL Pipelines, MySQL Replication, Redis In-Memory DB, Linux Administration', 'https://drive.google.com/file/d/karthik_resume_dbms/view')",
    [s3User.insertId]
  );

  // 4. DBMS-THEMED INTERNSHIPS
  // Job 1 (TechNova)
  const [j1] = await db.query(`
    INSERT INTO internships (company_id, title, description, required_skills, location, work_mode, stipend, duration_months, application_deadline, status)
    VALUES (?,
      'Database Administrator (DBA) Intern',
      'Manage high-availability MySQL clusters, design automated backup and point-in-time recovery pipelines, monitor query execution latency with EXPLAIN plans, and enforce referential integrity constraints across production shards.',
      'MySQL, Database Administration, Query Tuning, Index Optimization, Linux',
      'Bengaluru, KA', 'HYBRID', 18000.00, 6, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 'OPEN')
  `, [c1.insertId]);

  // Job 2 (Oracle Labs)
  const [j2] = await db.query(`
    INSERT INTO internships (company_id, title, description, required_skills, location, work_mode, stipend, duration_months, application_deadline, status)
    VALUES (?,
      'SQL Query Optimization & Data Modeling Intern',
      'Collaborate with database research architects to design normalized relational schemas (3NF/BCNF), author complex multi-table SQL queries, evaluate B-Tree vs Hash index performance, and benchmark transaction throughput.',
      'SQL, Relational Schema Design, Normalization, Query Execution Plans, C++',
      'Bengaluru, KA', 'ONSITE', 25000.00, 4, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 'OPEN')
  `, [c2.insertId]);

  // Job 3 (PostgreSys)
  const [j3] = await db.query(`
    INSERT INTO internships (company_id, title, description, required_skills, location, work_mode, stipend, duration_months, application_deadline, status)
    VALUES (?,
      'Backend & Relational Database Systems Intern',
      'Build robust Node.js/Express and Python microservices communicating with PostgreSQL databases. Implement ACID-compliant transactions, connection pooling, prepared statements, and role-based access control.',
      'PostgreSQL, Node.js, Express, REST APIs, ACID Transactions, Connection Pooling',
      'Pune, MH', 'REMOTE', 20000.00, 3, DATE_ADD(CURDATE(), INTERVAL 90 DAY), 'OPEN')
  `, [c3.insertId]);

  // Job 4 (TechNova)
  const [j4] = await db.query(`
    INSERT INTO internships (company_id, title, description, required_skills, location, work_mode, stipend, duration_months, application_deadline, status)
    VALUES (?,
      'ETL Pipeline & Relational Data Engineering Intern',
      'Develop automated SQL data extraction, transformation, and loading (ETL) routines. Maintain relational foreign key cascades, construct indexed analytical views, and write scheduled triggers for data audit trails.',
      'SQL, Python, ETL Pipelines, Triggers, Relational Views, Data Cleansing',
      'Bengaluru, KA', 'ONSITE', 16000.00, 3, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'OPEN')
  `, [c1.insertId]);

  // Job 5 (Oracle Labs)
  const [j5] = await db.query(`
    INSERT INTO internships (company_id, title, description, required_skills, location, work_mode, stipend, duration_months, application_deadline, status)
    VALUES (?,
      'Cloud Relational Database Architect Intern',
      'Assist senior DB architects in modeling distributed transactional databases, evaluating ACID vs BASE consistency trade-offs, configuring database replication streams, and tuning InnoDB buffer pools.',
      'Distributed DBMS, InnoDB Tuning, SQL, Replication, Cloud Infrastructure',
      'Hyderabad, TS', 'HYBRID', 22000.00, 6, DATE_ADD(CURDATE(), INTERVAL 75 DAY), 'OPEN')
  `, [c2.insertId]);

  // 5. APPLICATIONS (Varied statuses to showcase workflows)
  await db.query(`
    INSERT INTO applications (internship_id, student_id, cover_letter, resume_path, application_status)
    VALUES (?, ?,
      'I have strong practical experience with MySQL indexing, schema normalization up to BCNF, and writing parameterized SQL queries. Excited to contribute to TechNova DB infrastructure.',
      'https://drive.google.com/file/d/rohit_resume_dbms/view', 'SHORTLISTED')
  `, [j1.insertId, s1.insertId]);

  await db.query(`
    INSERT INTO applications (internship_id, student_id, cover_letter, resume_path, application_status)
    VALUES (?, ?,
      'My coursework covers query execution plans, relational algebra, and B-tree optimization. I would love to work on Oracle query optimizer benchmarks.',
      'https://drive.google.com/file/d/rohit_resume_dbms/view', 'APPLIED')
  `, [j2.insertId, s1.insertId]);

  await db.query(`
    INSERT INTO applications (internship_id, student_id, cover_letter, resume_path, application_status)
    VALUES (?, ?,
      'Maintained 9.20 CGPA with top score in Database Management Systems. Skilled in PostgreSQL connection pooling, stored procedures, and ACID compliance.',
      'https://drive.google.com/file/d/ananya_resume_dbms/view', 'SELECTED')
  `, [j3.insertId, s2.insertId]);

  await db.query(`
    INSERT INTO applications (internship_id, student_id, cover_letter, resume_path, application_status)
    VALUES (?, ?,
      'Passionate about ETL pipelines, foreign key cascade integrity, and building high-speed analytical views.',
      'https://drive.google.com/file/d/karthik_resume_dbms/view', 'APPLIED')
  `, [j4.insertId, s3.insertId]);

  console.log('DBMS Internship Portal demo database successfully seeded!');
  console.log('---------------------------------------------------------');
  console.log('Demo Credentials (Password for all: Pass@123):');
  console.log('  Admin:   admin@portal.com');
  console.log('  Student: rohit@student.com  (or ananya@student.com, karthik@student.com)');
  console.log('  Company: hr@technova.com    (or hr@oraclecloud.com, hr@postgresys.com)');
  console.log('---------------------------------------------------------');
  process.exit(0);
})().catch(e => {
  console.error('Seed Error:', e.message);
  process.exit(1);
});
