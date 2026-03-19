# MechWorkx Backend API Documentation

Live Server: `http://localhost:5000`

---

## 🔐 Authentication
**Base Path:** `/auth`

| Endpoint | Method | Description |
|---|---|---|
| `/signup` | POST | Create a new account |
| `/login` | POST | Login with phone number and password |
| `/verify-otp` | POST | Verify OTP for account activation |

---

## 💼 Job Management
**Base Path:** `/api/jobs`
*(Requires `Authorization: Bearer <token>`)*

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/send-otp` | POST | Customer | Request OTP to post a new job |
| `/verify-otp-submit` | POST | Customer | Verify OTP and create job (Multipart/form-data) |
| `/my-jobs` | GET | Customer | List all jobs (Supports `?tab=all,open,active,awarded,closed`) |
| `/:jobId` | PUT | Customer | Update job details (title, budget, address, etc.) |
| `/:jobId` | DELETE | Customer | Delete a job (only if status is 'open') |
| `/ongoing` | GET | Both | List all ongoing/active jobs |
| `/available` | GET | Vendor | Browse available public or invited jobs |
| `/categories` | GET | Public | List all job categories |
| `/job-works/:categoryId` | GET | Public | List job works for a specific category |

---

## 🏗️ Bidding & Awarding
**Base Path:** `/api/bids`
*(Requires `Authorization: Bearer <token>`)*

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/submit` | POST | Vendor | Submit a new bid for a job |
| `/my-bids` | GET | Vendor | List all bids submitted by the vendor |
| `/job/:jobId` | GET | Customer | View all bids received for a specific job |
| `/award` | POST | Customer | Award a job to a specific vendor |

---

## 📈 Progress & Execution
**Base Path:** `/api/progress`
*(Requires `Authorization: Bearer <token>`)*

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/:jobId/accept` | POST | Vendor | Accept the award and start the job |
| `/:jobId/update` | POST | Vendor | Update progress % and notes (uploads inspection sheet) |
| `/:jobId/shipment` | POST | Vendor | Update shipment status and upload documents |

---

## 🏠 Dashboard & Misc
**Base Path:** `/api/dash`
*(Requires `Authorization: Bearer <token>`)*

| Endpoint | Method | Role | Description |
|---|---|---|---|
| `/customer` | GET | Customer | Get customer dashboard metrics |
| `/vendor` | GET | Vendor | Get vendor dashboard metrics |
| `/vendors` | GET | Both | List all registered vendors |

---

## 💬 Messaging
**Base Path:** `/api/messages`
*(Requires `Authorization: Bearer <token>`)*

| Endpoint | Method | Description |
|---|---|---|
| `/` | POST | Send a message for a specific job |
| `/job/:jobId` | GET | Retrieve conversation history for a job |

---

## 🛡️ Admin Panel
**Base Path:** `/api/dash/admin`
*(Requires `Authorization: Bearer <token>` & Admin role)*

| Endpoint | Method | Description |
|---|---|---|
| `/users` | GET | List all users in the system |
| `/jobs` | GET | List all jobs in the system |
| `/categories` | POST | Create a new job category |---

## 🚀 How to Test "Get a Quote" (5-Step Flow)

Use Postman to simulate the 5-section wizard:

### 1. [Section 1 & 2] Fetch Options
- `GET /api/jobs/categories` -> Get Category ID.
- `GET /api/jobs/job-works/<category_id>` -> Get Job Work ID.

### 2. [Section 3] File Preparation
- Prepare up to 3 files to upload.

### 3. [Section 4] Form Data
- Collect all job details: title, description, budget, deadline, material details, and **Trade Details** (Trade Name, Address, Email, Phone).

### 4. [Section 5] OTP Initiation
- `POST /api/jobs/send-otp` (JSON)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "jobWork": "CNC Turning" }`
- **Response**: Copy the 4-digit `otp`.

### 5. [Section 5] Submission
- `POST /api/jobs/verify-otp-submit` (**Multipart Form-Data**)
  - Headers: `Authorization: Bearer <token>`
  - Pass all fields: `otp`, `title`, `description`, `material_type`, `quantity`, `budget`, `deadline`, `job_type`, `delivery_location`, `address`, `city`, `pincode`, `trade_name`, `trade_address`, `email`, `phone_number`, `material_provider`, `category_id`, `job_work_id`.
  - Field `files`: Upload up to 3 files.

---

## 🛠️ Environment Setup
1. Clone the repo.
2. Run `npm install`.
3. Create `.env` with `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`.
4. Run migrations from `sql/schema.sql`.
5. Start server: `npm run dev`.
