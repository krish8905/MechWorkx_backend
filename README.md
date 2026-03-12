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
| `/my-jobs` | GET | Customer | List all jobs posted by the logged-in customer |
| `/:jobId` | PUT | Customer | Update job details (title, budget, address, etc.) |
| `/:jobId` | DELETE | Customer | Delete a job (only if status is 'open') |
| `/ongoing` | GET | Both | List all ongoing/active jobs |
| `/available` | GET | Vendor | Browse available public or invited jobs |

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
| `/categories` | POST | Create a new job category |



