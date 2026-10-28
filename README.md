# Relational Database Management Systems (DBMS) Course Project
# Job & Internship Placement Portal

A full-stack **Database Management System (DBMS)** designed for student internship placements, campus drives, and corporate hiring workflows. Built on a normalized MySQL relational schema adhering to 3NF/BCNF principles with ACID-compliant transactions, role-based access control (RBAC), and composite indexing.

---

## 📌 Technology Stack

- **Relational Database**: MySQL 8.0+ (InnoDB Storage Engine with Row-Level Locking & Referential Integrity)
- **Backend API**: Node.js & Express.js (RESTful Architecture with Parameterized Prepared Statements)
- **Authentication**: JSON Web Tokens (JWT) & bcryptjs (Salt rounds: 10)
- **Frontend Client**: Modern HTML5, CSS3 Variables, ES6+ JavaScript (Responsive, Zero External UI Framework Dependencies)

---

## 🗄️ Relational Database Architecture

### Entities & Relationships (E-R Model)

```
[users] 1 ──── 1 [student_profiles] (PK/FK: user_id)
   │
   └─────── 1 ──── 1 [companies] (PK/FK: owner_user_id)
                        │
                        1
                        │
                        N
                  [internships]
                        │
                        1
                        │
                        N
                  [applications] M ──── 1 [student_profiles]
```

1. **`users` (Base Entity)**
   - `user_id` (INT, Primary Key, Auto Increment)
   - `full_name` (VARCHAR 100, NOT NULL)
   - `email` (VARCHAR 100, UNIQUE Candidate Key)
   - `password_hash` (VARCHAR 255, bcrypt hashed)
   - `phone` (VARCHAR 15)
   - `role` (ENUM: `'STUDENT'`, `'COMPANY'`, `'ADMIN'`)
   - `is_active` (BOOLEAN, Soft-deletion flag)
   - `created_at` (TIMESTAMP)

2. **`student_profiles` (Specialization Entity - 1:1 with users)**
   - `student_id` (INT, Primary Key)
   - `user_id` (INT, Foreign Key referencing `users(user_id)` ON DELETE CASCADE, UNIQUE)
   - `usn` (VARCHAR 30, University Seat Number, UNIQUE Candidate Key)
   - `college_name` (VARCHAR 150)
   - `branch` (VARCHAR 80)
   - `graduation_year` (YEAR)
   - `cgpa` (DECIMAL 4,2)
   - `skills` (TEXT)
   - `resume_path` (VARCHAR 255)

3. **`companies` (Specialization Entity - 1:1 with users)**
   - `company_id` (INT, Primary Key)
   - `owner_user_id` (INT, Foreign Key referencing `users(user_id)` ON DELETE CASCADE, UNIQUE)
   - `company_name` (VARCHAR 150, NOT NULL)
   - `website` (VARCHAR 200)
   - `location` (VARCHAR 100)
   - `description` (TEXT)

4. **`internships` (1:N Entity with companies)**
   - `internship_id` (INT, Primary Key)
   - `company_id` (INT, Foreign Key referencing `companies(company_id)` ON DELETE CASCADE)
   - `title` (VARCHAR 150, NOT NULL)
   - `description` (TEXT, NOT NULL)
   - `required_skills` (VARCHAR 255)
   - `location` (VARCHAR 100)
   - `work_mode` (ENUM: `'REMOTE'`, `'ONSITE'`, `'HYBRID'`)
   - `stipend` (DECIMAL 10,2)
   - `duration_months` (INT)
   - `application_deadline` (DATE, NOT NULL)
   - `status` (ENUM: `'OPEN'`, `'CLOSED'`)
   - `posted_at` (TIMESTAMP)
   - **Composite Index**: `idx_internship_open (status, application_deadline)`

5. **`applications` (M:N Associative Entity)**
   - `application_id` (INT, Primary Key)
   - `internship_id` (INT, Foreign Key referencing `internships(internship_id)` ON DELETE CASCADE)
   - `student_id` (INT, Foreign Key referencing `student_profiles(student_id)` ON DELETE CASCADE)
   - `cover_letter` (TEXT)
   - `resume_path` (VARCHAR 255)
   - `application_status` (ENUM: `'APPLIED'`, `'SHORTLISTED'`, `'REJECTED'`, `'SELECTED'`)
   - `applied_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)
   - **Integrity Constraint**: `CONSTRAINT unique_application UNIQUE (internship_id, student_id)`

---

## ⚡ Normalization Justification (1NF to 3NF/BCNF)

- **First Normal Form (1NF)**: All attributes contain strictly atomic (indivisible) values. No repeating groups or nested relations exist.
- **Second Normal Form (2NF)**: The schema is in 1NF and contains **no partial dependencies**. In the associative entity `applications`, all non-prime attributes functionally depend on the whole composite candidate key `(internship_id, student_id)`.
- **Third Normal Form (3NF)**: The schema is in 2NF and contains **no transitive dependencies**. For instance, company metadata is isolated in `companies` rather than duplicated in `internships` or `applications`. Modifying company location requires updating a single tuple, preventing update anomalies.

---

## 🚀 Quick Setup & Execution

### Prerequisites
- Node.js 18+ and MySQL 8.0+ installed and running.

### 1. Configure Database Credentials
Edit `.env` in the project root:
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
JWT_SECRET=dbms-secret-key-2026
PORT=3000
```

### 2. Install Dependencies & Initialize Database
```bash
npm install
npm run setup
```
> `npm run setup` automatically creates the database `job_internship_portal`, executes the DDL schema with relational views and indexes, and seeds realistic DBMS demo accounts.

### 3. Launch Server
```bash
npm start
```
Open **http://localhost:3000** in your browser.

> **Offline Preview Mode**: If testing without MySQL running, you can also open `public/index.html` directly in any web browser. The frontend includes an in-memory mock DBMS engine with all pre-loaded accounts and features.

---

## 🔑 Demo Login Credentials

All seed accounts use the default password: **`Pass@123`**

| Role | Name | Email | Focus / Key Details |
| :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@portal.com` | Complete user directory & listing moderation |
| **Company** | TechNova Data Solutions | `hr@technova.com` | MySQL clustering & query tuning internships |
| **Company** | Oracle Cloud Data Labs | `hr@oraclecloud.com` | Autonomous DB & query optimizer internships |
| **Student** | Rohit Biradar | `rohit@student.com` | USN: `1AB23CS001`, CGPA: 8.75, MySQL, 3NF |
| **Student** | Ananya Sharma | `ananya@student.com` | USN: `1AB23CS042`, CGPA: 9.20, PostgreSQL DBA |
| **Student** | Karthik Verma | `karthik@student.com` | USN: `1AB23CS088`, CGPA: 8.40, ETL & Replication |

> **Tip**: You can also use the 1-click demo login buttons in the top banner of the application to instantly test any role.

---

## 🎓 DBMS Viva Voce Talking Points

1. **How is duplicate application prevented?**
   - Enforced by the table constraint `CONSTRAINT unique_application UNIQUE (internship_id, student_id)`. The database engine prevents duplicate submissions with error `ER_DUP_ENTRY`.
2. **How is Atomicity maintained during student registration?**
   - Implemented via ACID database transactions: `await conn.beginTransaction()`, followed by inserting into `users` and `student_profiles`. If any query fails, `await conn.rollback()` is executed, preventing orphaned records.
3. **What is the advantage of the composite index `idx_internship_open`?**
   - Queries frequently execute `WHERE status = 'OPEN' AND application_deadline >= CURDATE()`. The composite index on `(status, application_deadline)` allows MySQL to use an index range scan rather than performing a full table scan.
4. **How does SQL injection prevention work?**
   - Every SQL statement is parameterized using prepared statement placeholders (`?`). Values are bound separately from query logic, neutralizing malicious SQL input.
5. **Why use `ON DELETE CASCADE`?**
   - Enforces referential integrity. When an internship or company record is deleted, all related child applications are automatically purged by the storage engine without leaving orphaned foreign keys.
