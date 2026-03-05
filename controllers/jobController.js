const pool = require("../config/db");

// ── CUSTOMER APIs ──

const sendJobOTP = async (req, res) => {
    try {
        const { phone } = req.user; // Use logged in user's phone
        const { jobWork } = req.body;

        if (!jobWork) return res.status(400).json({ success: false, message: "Job work title is required" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await pool.query(
            "INSERT INTO otp_verifications (user_id, otp_code, otp_expiry) VALUES ($1, $2, $3)",
            [req.user.id, otp, expiry]
        );

        console.log(`[JOB OTP] User: ${req.user.id} -> OTP: ${otp} for Job: ${jobWork}`);

        return res.json({
            success: true,
            message: "OTP sent for job verification",
            otp // sim SMS
        });
    } catch (err) {
        console.error("SEND JOB OTP ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const verifyAndSubmitJob = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            otp, title, description, material_type, quantity, budget,
            deadline, job_type, delivery_location, material_provider,
            category_id, invited_vendor_ids
        } = req.body;
        const customerId = req.user.id;

        if (!otp || !title || !description || !job_type) {
            return res.status(400).json({ success: false, message: "OTP, Title, description, and job type are required" });
        }

        await client.query("BEGIN");

        // Verify OTP
        const otpCheck = await client.query(
            `SELECT id FROM otp_verifications 
             WHERE user_id = $1 AND otp_code = $2 AND is_verified = false 
             AND otp_expiry > NOW() 
             ORDER BY created_at DESC LIMIT 1`,
            [customerId, otp]
        );

        if (otpCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        // Mark OTP as used
        await client.query("UPDATE otp_verifications SET is_verified = true WHERE id = $1", [otpCheck.rows[0].id]);

        // Insert Job
        const result = await client.query(
            `INSERT INTO jobs (
                customer_id, title, description, material_type, quantity, 
                budget, deadline, job_type, delivery_location, material_provider
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                customerId, title, description, material_type, quantity,
                budget, deadline, job_type, delivery_location, material_provider
            ]
        );

        const job = result.rows[0];

        // Link category if provided
        if (category_id) {
            await client.query(
                "INSERT INTO job_category_mapping (job_id, category_id) VALUES ($1, $2)",
                [job.id, category_id]
            );
        }

        // Handle private job invitations
        if (job_type === 'private' && Array.isArray(invited_vendor_ids)) {
            for (const vendorId of invited_vendor_ids) {
                await client.query(
                    "INSERT INTO job_invitations (job_id, vendor_id, status) VALUES ($1, $2, 'invited')",
                    [job.id, vendorId]
                );
            }
        }

        await client.query("COMMIT");

        return res.status(201).json({ success: true, message: "Job created successfully", job });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("VERIFY AND SUBMIT JOB ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    } finally {
        client.release();
    }
};

const getCustomerJobs = async (req, res) => {
    try {
        const { status } = req.query; // all, active, awarded, closed
        const customerId = req.user.id;

        let query = "SELECT * FROM jobs WHERE customer_id = $1";
        const params = [customerId];

        if (status && status !== 'all') {
            query += " AND status = $2";
            params.push(status);
        }

        query += " ORDER BY created_at DESC";

        const result = await pool.query(query, params);
        return res.json({ success: true, count: result.rowCount, jobs: result.rows });
    } catch (err) {
        console.error("GET CUSTOMER JOBS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const editJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const customerId = req.user.id;
        const updates = req.body;

        // Ensure job is not awarded/active
        const jobCheck = await pool.query("SELECT status FROM jobs WHERE id = $1 AND customer_id = $2", [jobId, customerId]);
        if (jobCheck.rowCount === 0) return res.status(404).json({ success: false, message: "Job not found" });
        if (jobCheck.rows[0].status !== 'open') return res.status(400).json({ success: false, message: "Cannot edit job that is already awarded or active" });

        // Build dynamic UPDATE query
        const fields = [];
        const values = [];
        let i = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (['title', 'description', 'material_type', 'quantity', 'budget', 'deadline', 'delivery_location'].includes(key)) {
                fields.push(`${key} = $${i++}`);
                values.push(value);
            }
        }

        if (fields.length === 0) return res.status(400).json({ success: false, message: "No valid fields provided for update" });

        values.push(jobId, customerId);
        const query = `UPDATE jobs SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = $${i++} AND customer_id = $${i} RETURNING *`;

        const result = await pool.query(query, values);
        return res.json({ success: true, message: "Job updated successfully", job: result.rows[0] });
    } catch (err) {
        console.error("EDIT JOB ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ── VENDOR APIs ──

const getAvailableJobs = async (req, res) => {
    try {
        const vendorId = req.user.id;

        // Public jobs AND private jobs where invited
        const query = `
            SELECT j.* FROM jobs j
            LEFT JOIN job_invitations ji ON j.id = ji.job_id AND ji.vendor_id = $1
            WHERE j.status = 'open'
            AND (j.job_type = 'public' OR ji.vendor_id IS NOT NULL)
            ORDER BY j.created_at DESC
        `;

        const result = await pool.query(query, [vendorId]);
        return res.json({ success: true, count: result.rowCount, jobs: result.rows });
    } catch (err) {
        console.error("GET AVAILABLE JOBS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

const getOngoingJobs = async (req, res) => {
    try {
        const userId = req.user.id;
        const userType = req.user.user_type;

        let query = "";
        const params = [userId];

        if (userType === 'customer' || userType === 'admin') {
            query = `SELECT * FROM jobs WHERE customer_id = $1 AND status IN ('open', 'awarded', 'active', 'on_hold') ORDER BY created_at DESC`;
        } else if (userType === 'vendor') {
            query = `SELECT * FROM jobs WHERE awarded_vendor_id = $1 AND status IN ('awarded', 'active', 'on_hold') ORDER BY created_at DESC`;
        } else if (userType === 'both') {
            query = `SELECT * FROM jobs WHERE (customer_id = $1 OR awarded_vendor_id = $1) AND status IN ('open', 'awarded', 'active', 'on_hold') ORDER BY created_at DESC`;
        }

        const result = await pool.query(query, params);
        return res.json({ success: true, count: result.rowCount, jobs: result.rows });
    } catch (err) {
        console.error("GET ONGOING JOBS ERROR:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { sendJobOTP, verifyAndSubmitJob, getCustomerJobs, editJob, getAvailableJobs, getOngoingJobs };
