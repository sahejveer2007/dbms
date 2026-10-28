-- =====================================================================
-- DATABASE MANAGEMENT SYSTEMS (DBMS) COURSE PROJECT
-- PROJECT: Relational Job & Internship Portal
-- DATABASE: MySQL 8.0+
-- =====================================================================
-- Relational Model Summary:
--   1. users (Base entity for authentication & role-based access)
--   2. student_profiles (1:1 with users where role = 'STUDENT')
--   3. companies (1:1 with users where role = 'COMPANY')
--   4. internships (1:N with companies)
--   5. applications (M:N associative entity between students & internships)
--
-- Normalization:
--   - 1NF: All attributes are atomic (no repeating groups)
--   - 2NF: No partial dependencies; non-prime attributes depend on full PK
--   - 3NF: No transitive dependencies (e.g. company info is stored in companies,
--          not duplicated across internships or applications)
-- =====================================================================

DROP DATABASE IF EXISTS job_internship_portal;
CREATE DATABASE job_internship_portal
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE job_internship_portal;

-- ---------------------------------------------------------------------
-- TABLE 1: users
-- Represents all registered actors (Student, Company HR, Portal Admin).
-- Primary Key: user_id
-- Unique Candidate Key: email
-- ---------------------------------------------------------------------
CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  role ENUM('STUDENT', 'COMPANY', 'ADMIN') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 2: student_profiles
-- 1:1 specialization of users table for students.
-- Primary Key: student_id
-- Foreign Key: user_id -> users(user_id) [ON DELETE CASCADE]
-- Candidate Key: usn (University Seat Number)
-- ---------------------------------------------------------------------
CREATE TABLE student_profiles (
  student_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  usn VARCHAR(30) NOT NULL UNIQUE,
  college_name VARCHAR(150),
  branch VARCHAR(80),
  graduation_year YEAR,
  cgpa DECIMAL(4,2),
  skills TEXT,
  resume_path VARCHAR(255),
  CONSTRAINT fk_student_user
    FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_student_cgpa (cgpa),
  INDEX idx_student_branch (branch)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 3: companies
-- 1:1 specialization of users table for corporate hiring accounts.
-- Primary Key: company_id
-- Foreign Key: owner_user_id -> users(user_id) [ON DELETE CASCADE]
-- ---------------------------------------------------------------------
CREATE TABLE companies (
  company_id INT PRIMARY KEY AUTO_INCREMENT,
  owner_user_id INT NOT NULL UNIQUE,
  company_name VARCHAR(150) NOT NULL,
  website VARCHAR(200),
  location VARCHAR(100),
  description TEXT,
  CONSTRAINT fk_company_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_company_name (company_name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 4: internships
-- 1:N relationship with companies.
-- Primary Key: internship_id
-- Foreign Key: company_id -> companies(company_id) [ON DELETE CASCADE]
-- Composite Index: (status, application_deadline) for high-performance browsing
-- ---------------------------------------------------------------------
CREATE TABLE internships (
  internship_id INT PRIMARY KEY AUTO_INCREMENT,
  company_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  required_skills VARCHAR(255),
  location VARCHAR(100),
  work_mode ENUM('REMOTE', 'ONSITE', 'HYBRID') DEFAULT 'ONSITE',
  stipend DECIMAL(10,2),
  duration_months INT,
  application_deadline DATE NOT NULL,
  status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
  posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_internship_company
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_internship_open (status, application_deadline),
  INDEX idx_internship_work_mode (work_mode)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TABLE 5: applications
-- Associative entity resolving M:N relationship between students & internships.
-- Primary Key: application_id
-- Foreign Keys:
--   internship_id -> internships(internship_id) [ON DELETE CASCADE]
--   student_id    -> student_profiles(student_id) [ON DELETE CASCADE]
-- Integrity Constraint: UNIQUE (internship_id, student_id) prevents duplicates
-- ---------------------------------------------------------------------
CREATE TABLE applications (
  application_id INT PRIMARY KEY AUTO_INCREMENT,
  internship_id INT NOT NULL,
  student_id INT NOT NULL,
  cover_letter TEXT,
  resume_path VARCHAR(255),
  application_status ENUM('APPLIED', 'SHORTLISTED', 'REJECTED', 'SELECTED') DEFAULT 'APPLIED',
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_internship
    FOREIGN KEY (internship_id) REFERENCES internships(internship_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_app_student
    FOREIGN KEY (student_id) REFERENCES student_profiles(student_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT unique_application
    UNIQUE (internship_id, student_id),
  INDEX idx_app_status (application_status)
) ENGINE=InnoDB;

-- =====================================================================
-- RELATIONAL VIEWS (DBMS Evaluation Artifacts)
-- =====================================================================

-- View 1: Active Internships with Company Metadata
CREATE OR REPLACE VIEW view_active_internships AS
SELECT
  i.internship_id,
  i.title,
  c.company_name,
  c.location AS company_headquarters,
  i.location AS job_location,
  i.work_mode,
  i.stipend,
  i.duration_months,
  i.required_skills,
  i.application_deadline,
  i.posted_at
FROM internships i
JOIN companies c ON i.company_id = c.company_id
WHERE i.status = 'OPEN' AND i.application_deadline >= CURDATE();

-- View 2: Complete Student Application Trail
CREATE OR REPLACE VIEW view_student_applications AS
SELECT
  a.application_id,
  a.student_id,
  u.full_name AS student_name,
  s.usn,
  s.cgpa,
  s.branch,
  i.internship_id,
  i.title AS internship_title,
  c.company_name,
  a.application_status,
  a.applied_at,
  a.updated_at
FROM applications a
JOIN student_profiles s ON a.student_id = s.student_id
JOIN users u ON s.user_id = u.user_id
JOIN internships i ON a.internship_id = i.internship_id
JOIN companies c ON i.company_id = c.company_id;

-- View 3: DBMS Portal Aggregates & System Summary
CREATE OR REPLACE VIEW view_dbms_portal_summary AS
SELECT
  (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') AS total_students,
  (SELECT COUNT(*) FROM companies) AS total_companies,
  (SELECT COUNT(*) FROM internships WHERE status = 'OPEN') AS active_internships,
  (SELECT COUNT(*) FROM applications) AS total_applications,
  (SELECT COUNT(*) FROM applications WHERE application_status = 'SELECTED') AS total_placed;
