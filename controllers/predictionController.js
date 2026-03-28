const pool = require('../config/db');

// Maps to: saveDiagnosisResult in Flutter
const saveDiagnosis = async (req, res) => {
    const userId = req.user.user_id;
    const { riskLevel } = req.body; // e.g., "High Risk" or "Low Risk"

    try {
        const isHighRiskBool = riskLevel.toLowerCase() === 'high risk';

        const existing = await pool.query('SELECT * FROM CVD_RESULT WHERE user_id = $1', [userId]);
        
        if (existing.rows.length === 0) {
            await pool.query(
                `INSERT INTO CVD_RESULT (user_id, bool_result, recorded_at) VALUES ($1, $2, NOW())`,
                [userId, isHighRiskBool]
            );
        } else {
            await pool.query(
                `UPDATE CVD_RESULT SET bool_result = $1, recorded_at = NOW() WHERE user_id = $2`,
                [isHighRiskBool, userId]
            );
        }

        res.status(200).json({ success: true, message: "Diagnosis saved successfully" });

    } catch (error) {
        console.error("Save Diagnosis Error:", error);
        res.status(500).json({ error: "Failed to save CVD prediction" });
    }
};

module.exports = { saveDiagnosis }; // Don't forget to update your aiRoutes.js to point to this!