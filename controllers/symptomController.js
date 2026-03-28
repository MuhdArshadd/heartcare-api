const pool = require('../config/db');

// Maps to: addSymptom
const addSymptom = async (req, res) => {
    const userId = req.user.user_id;
    const { selectedIds, symptomActive } = req.body;

    try {
        for (let symptomId of selectedIds) {
            await pool.query(
                `INSERT INTO USER_SYMPTOM (user_id, symptom_id, bool_symptom_active, last_update)
                 VALUES ($1, $2, $3, NOW())`,
                [userId, symptomId, symptomActive]
            );
        }
        res.status(201).json({ success: true, message: "Symptoms added successfully." });
    } catch (error) {
        res.status(500).json({ error: "Error adding symptoms" });
    }
};

// Maps to: getUserSymptoms
const getUserSymptoms = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const results = await pool.query(
            `SELECT s.symptom_name, us.bool_symptom_active, us.last_update, us.user_symptom_id, us.symptom_id
             FROM SYMPTOM s 
             JOIN USER_SYMPTOM us ON s.symptom_id = us.symptom_id
             WHERE us.user_id = $1`,
            [userId]
        );

        const userSymptoms = {};
        results.rows.forEach(row => {
            userSymptoms[row.symptom_name] = {
                isActive: row.bool_symptom_active,
                lastUpdate: row.last_update,
                userSymptomId: row.user_symptom_id,
                symptomId: row.symptom_id
            };
        });

        res.status(200).json({ success: true, data: userSymptoms });
    } catch (error) {
        res.status(500).json({ error: "Error fetching user symptoms" });
    }
};

// Maps to: addSymptomLog
const addSymptomLog = async (req, res) => {
    const { user_symptom_id, date, time, severity, notes } = req.body;

    try {
        await pool.query(
            `INSERT INTO USER_SYMPTOM_LOG (user_symptom_id, recorded_at_date, recorded_at_time, severity, notes)
             VALUES ($1, $2, $3, $4, $5)`,
            [user_symptom_id, date, time, severity, notes]
        );
        res.status(201).json({ success: true, message: "Symptom log added." });
    } catch (error) {
        res.status(500).json({ error: "Error adding symptom log" });
    }
};

// Maps to: fetchSymptomLogs
const getSymptomLogs = async (req, res) => {
    const { userSymptomId, date } = req.query;

    try {
        const result = await pool.query(
            `SELECT recorded_at_date, to_char(recorded_at_time, 'HH24:MI') as time, severity, notes
             FROM USER_SYMPTOM_LOG
             WHERE user_symptom_id = $1 AND recorded_at_date = $2`,
            [userSymptomId, date]
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ error: "Error fetching logs" });
    }
};

// Maps to: getWeeklySeverityAverages (OPTIMIZED)
const getWeeklyAverages = async (req, res) => {
    const { userSymptomId } = req.params;

    try {
        const result = await pool.query(
            `SELECT 
                to_char(recorded_at_date, 'Dy') as day_label,
                AVG(severity)::float as average_severity
             FROM USER_SYMPTOM_LOG
             WHERE user_symptom_id = $1 
             AND recorded_at_date >= CURRENT_DATE - INTERVAL '6 days'
             GROUP BY recorded_at_date
             ORDER BY recorded_at_date ASC`,
            [userSymptomId]
        );

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        res.status(500).json({ error: "Error calculating weekly averages" });
    }
};

// Maps to: updateSymptomStatus
const updateSymptomStatus = async (req, res) => {
    const { userSymptomId, symptomId, activeStatus } = req.body;

    try {
        await pool.query(
            `UPDATE USER_SYMPTOM
             SET bool_symptom_active = $1, last_update = NOW()
             WHERE user_symptom_id = $2 AND symptom_id = $3`,
            [activeStatus, userSymptomId, symptomId]
        );
        res.status(200).json({ success: true, message: "Status updated." });
    } catch (error) {
        res.status(500).json({ error: "Error updating symptom status" });
    }
};

module.exports = { 
    addSymptom, 
    getUserSymptoms, 
    addSymptomLog, 
    getSymptomLogs, 
    getWeeklyAverages, 
    updateSymptomStatus 
};