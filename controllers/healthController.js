const pool = require('../config/db');

// Maps to: insertUserRiskFactors
const updateRiskFactors = async (req, res) => {
    const userId = req.user.user_id;
    const { risks } = req.body; // Expecting an array or map of risk IDs to booleans

    const riskIdMap = {
        "Diabetes Mellitus": 1, 
        "Hypertension": 2, 
        "Hypercholesterolemia": 3,
        "Smoking": 4, 
        "Obesity": 5, 
        "Family history of CVD": 6
    };

    try {
        for (const [riskName, presence] of Object.entries(risks)) {
            const riskId = riskIdMap[riskName];
            if (!riskId) continue;

            await pool.query(
                `INSERT INTO USER_RISK_FACTOR (user_id, risk_id, bool_risk_presence, last_update)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (user_id, risk_id) DO UPDATE
                 SET bool_risk_presence = EXCLUDED.bool_risk_presence, last_update = NOW()`,
                [userId, riskId, presence]
            );
        }
        res.status(200).json({ success: true, message: "Risk factors updated." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error updating risk factors" });
    }
};

// Maps to: getDiagnoseResult & fetchRiskLevelAndLastDiagnose & getHeartHealthStatusAndSmoking
const getDashboardStats = async (req, res) => {
    const userId = req.user.user_id;

    try {
        // 1. Get CVD Result (Runs the query ONCE for all three Flutter functions)
        const cvdResult = await pool.query(
            `SELECT bool_result, recorded_at FROM CVD_RESULT WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
            [userId]
        );

        // 2. Get Smoking Status (Risk ID 4)
        const smokingResult = await pool.query(
            `SELECT bool_risk_presence FROM USER_RISK_FACTOR WHERE user_id = $1 AND risk_id = 4`,
            [userId]
        );

        const hasRisk = cvdResult.rows.length > 0 ? cvdResult.rows[0].bool_result : null;
        const lastUpdate = cvdResult.rows.length > 0 ? cvdResult.rows[0].recorded_at : null;
        const isSmoking = smokingResult.rows.length > 0 ? smokingResult.rows[0].bool_risk_presence : false;

        // 3. Send back a master JSON object that satisfies everything UI needs
        res.status(200).json({
            success: true,
            
            // Expected by fetchRiskLevelAndLastDiagnose
            riskLevelFull: hasRisk === null ? "Unidentified" : (hasRisk ? "High Risk" : "Low Risk"),
            lastDiagnose: lastUpdate,

            // Expected by getDiagnoseResult
            riskLevelShort: hasRisk === null ? "Unidentified" : (hasRisk ? "High" : "Low"),
            lastDiagnosis: lastUpdate,

            // Expected by getHeartHealthStatusAndSmoking
            heartHealthStatus: hasRisk === null ? "Not Available" : (hasRisk ? "High" : "Normal"),
            smokingStatus: isSmoking ? 'Yes' : 'No'
        });

    } catch (error) {
        res.status(500).json({ error: "Error fetching dashboard stats" });
    }
};

// Maps to: updateCVDResult
const updateCVDResult = async (req, res) => {
    const userId = req.user.user_id;
    const { bool_result } = req.body;

    try {
        const existing = await pool.query('SELECT * FROM CVD_RESULT WHERE user_id = $1', [userId]);

        if (existing.rows.length === 0) {
            await pool.query(
                `INSERT INTO CVD_RESULT (user_id, bool_result, recorded_at) VALUES ($1, $2, NOW())`,
                [userId, bool_result]
            );
        } else {
            await pool.query(
                `UPDATE CVD_RESULT SET bool_result = $1, recorded_at = NOW() WHERE user_id = $2`,
                [bool_result, userId]
            );
        }
        res.status(200).json({ success: true, message: "CVD Result updated." });
    } catch (error) {
        res.status(500).json({ error: "Error updating CVD result" });
    }
};

// Maps to: getCVDpresence
const getCVDPresence = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const results = await pool.query(
            `SELECT crf.cvd_risk_name, crf.cvd_short_description, urf.bool_risk_presence, urf.last_update
             FROM USER_RISK_FACTOR urf
             JOIN CVD_RISK_FACTOR crf ON crf.risk_id = urf.risk_id
             WHERE urf.user_id = $1`,
            [userId]
        );

        const cvdRisks = {};
        results.rows.forEach(row => {
            cvdRisks[row.cvd_risk_name] = {
                description: row.cvd_short_description,
                status: row.bool_risk_presence ? 'Present' : 'Not Present',
                date: row.last_update
            };
        });

        res.status(200).json({ success: true, data: cvdRisks });
    } catch (error) {
        res.status(500).json({ error: "Error fetching CVD presence" });
    }
};

// Maps to: getUserActiveSymptoms
const getActiveSymptoms = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const results = await pool.query(
            `SELECT s.symptom_name, us.last_update
             FROM SYMPTOM s 
             JOIN USER_SYMPTOM us ON s.symptom_id = us.symptom_id
             WHERE us.user_id = $1 AND us.bool_symptom_active = true`,
            [userId]
        );

        const userSymptoms = {};
        results.rows.forEach(row => {
            userSymptoms[row.symptom_name] = row.last_update;
        });

        res.status(200).json({ success: true, data: userSymptoms });
    } catch (error) {
        res.status(500).json({ error: "Error fetching active symptoms" });
    }
};

// Maps to: fetchHealthReadings
const getHealthReadings = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const results = await pool.query(
            `SELECT reading_type, health_reading_category, last_update
             FROM HEALTH_METRICS
             WHERE user_id = $1`,
            [userId]
        );

        const healthReadings = results.rows.map(row => ({
            readingType: row.reading_type || 'Unknown',
            category: row.health_reading_category || 'N/A',
            lastUpdate: row.last_update || 'Unknown'
        }));

        res.status(200).json({ success: true, data: healthReadings });
    } catch (error) {
        res.status(500).json({ error: "Error fetching health readings" });
    }
};

module.exports = { 
    updateRiskFactors, 
    getDashboardStats,
    updateCVDResult,
    getCVDPresence,
    getActiveSymptoms,
    getHealthReadings
};