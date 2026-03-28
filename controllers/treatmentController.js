const pool = require('../config/db');

// Helper function safely tucked in the backend
const getTimeSlotId = (timeOfDay) => {
    if (timeOfDay.includes('Morning')) return 1;
    if (timeOfDay.includes('Afternoon')) return 2;
    if (timeOfDay.includes('Evening')) return 3;
    if (timeOfDay.includes('Night')) return 4;
    return 1; 
};

// Maps to: addTreatment
const addTreatment = async (req, res) => {
    const userId = req.user.user_id;
    const { timesOfDay, category, name, description, dosage, unit, quantity, type } = req.body;

    // Grab a dedicated client from the pool to run a Transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Start Transaction

        for (const timeOfDay of timesOfDay) {
            const timeSlotId = getTimeSlotId(timeOfDay);

            // 1. Insert Core Treatment
            const treatmentResult = await client.query(
                `INSERT INTO TREATMENT (user_id, category, treatment_name, notes, treatment_times_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING treatment_id`,
                [userId, category, name, description, timeSlotId]
            );
            const treatmentId = treatmentResult.rows[0].treatment_id;

            // 2. Insert Medication Details (if applicable)
            if (category === 'Medication' || category === 'Supplement') {
                await client.query(
                    `INSERT INTO TREATMENT_MEDICATION_SUPPLEMENT 
                     (treatment_id, dosage_per_intake, unit_of_dosage, quantity_per_session, medication_type)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [treatmentId, dosage || null, unit || '', quantity || null, type || '']
                );
            }

            // 3. Insert Initial Pending Log
            await client.query(
                `INSERT INTO TREATMENT_LOG (treatment_id, status, recorded_at)
                 VALUES ($1, 'Pending', NOW())`,
                [treatmentId]
            );
        }

        await client.query('COMMIT'); // Save everything
        res.status(201).json({ success: true, message: "Treatments added successfully." });
    } catch (error) {
        await client.query('ROLLBACK'); // Cancel everything if an error happens
        console.error("Transaction Error:", error);
        res.status(500).json({ error: "Failed to add treatment" });
    } finally {
        client.release(); // Return client to the pool
    }
};

// Maps to: getTreatment
const getTreatments = async (req, res) => {
    const userId = req.user.user_id;
    const { page, date, timelineId } = req.query; // e.g., ?page=Homepage&date=2026-03-26&timelineId=1

    try {
        let sqlQuery = `
            SELECT t.treatment_id, t.category, t.treatment_name, t.notes, t.treatment_times_id, 
                   tms.dosage_per_intake, tms.unit_of_dosage, tms.quantity_per_session, tms.medication_type,
                   (SELECT status FROM TREATMENT_LOG tl WHERE tl.treatment_id = t.treatment_id AND tl.recorded_at = $2 LIMIT 1) as log_status
            FROM TREATMENT t
            LEFT JOIN TREATMENT_MEDICATION_SUPPLEMENT tms ON t.treatment_id = tms.treatment_id
            WHERE t.user_id = $1 
            AND t.created_at <= $2
            AND (t.last_treatment_at IS NULL OR $2 <= t.last_treatment_at)
        `;

        const queryParams = [userId, date];

        // Apply specific filters based on the page
        if (page === 'Homepage' && timelineId) {
            sqlQuery += ` AND t.treatment_times_id = $3 ORDER BY t.treatment_times_id ASC LIMIT 2`;
            queryParams.push(timelineId);
        } else {
            sqlQuery += ` ORDER BY t.treatment_times_id ASC`;
        }

        const result = await pool.query(sqlQuery, queryParams);
        
        // Format the raw SQL output into a clean JSON array
        const treatments = result.rows.map(row => ({
            id: row.treatment_id,
            category: row.category,
            name: row.treatment_name,
            notes: row.notes,
            treatmentTimesId: row.treatment_times_id,
            dosage: row.dosage_per_intake,
            unit: row.unit_of_dosage,
            sessionCount: row.quantity_per_session,
            medicationType: row.medication_type,
            status: row.log_status || "Pending"
        }));

        res.status(200).json({ success: true, data: treatments });
    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ error: "Failed to fetch treatments" });
    }
};

// Maps to: logTreatment
const logTreatment = async (req, res) => {
    const { treatmentId, date, status } = req.body;

    try {
        // UPSERT logic: Check if exists, if yes update, if no insert
        const existing = await pool.query(
            `SELECT treatment_log_id FROM TREATMENT_LOG WHERE treatment_id = $1 AND recorded_at = $2`,
            [treatmentId, date]
        );

        if (existing.rows.length > 0) {
            await pool.query(
                `UPDATE TREATMENT_LOG SET status = $1 WHERE treatment_log_id = $2`,
                [status, existing.rows[0].treatment_log_id]
            );
        } else {
            await pool.query(
                `INSERT INTO TREATMENT_LOG (treatment_id, status, recorded_at) VALUES ($1, $2, $3)`,
                [treatmentId, status, date]
            );
        }

        res.status(200).json({ success: true, message: "Treatment logged successfully." });
    } catch (error) {
        res.status(500).json({ error: "Failed to log treatment" });
    }
};

// Maps to: updateStatusTreatment (Ending/Archiving a treatment)
const stopTreatment = async (req, res) => {
    const { treatmentId } = req.body;

    try {
        await pool.query(
            `UPDATE TREATMENT SET last_treatment_at = NOW() WHERE treatment_id = $1`,
            [treatmentId]
        );
        res.status(200).json({ success: true, message: "Treatment stopped." });
    } catch (error) {
        res.status(500).json({ error: "Failed to stop treatment" });
    }
};

// Maps to: getTreatmentTimelineID
const getActiveTimelines = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const result = await pool.query(
            `SELECT DISTINCT treatment_times_id
             FROM TREATMENT
             WHERE user_id = $1 AND created_at <= NOW() AND (last_treatment_at IS NULL OR NOW() <= last_treatment_at)`,
            [userId]
        );

        const timelineIds = result.rows.map(row => row.treatment_times_id);
        res.status(200).json({ success: true, data: timelineIds });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch active timelines" });
    }
};

module.exports = { addTreatment, getTreatments, logTreatment, stopTreatment, getActiveTimelines };