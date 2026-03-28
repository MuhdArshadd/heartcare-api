const pool = require('../config/db');

// --- Medical Threshold Helpers (Internal to Backend) ---
const measureBP = (systolic, diastolic) => {
    if (systolic < 120 && diastolic < 80) return "Normal BP";
    if (systolic >= 120 && systolic <= 129 && diastolic < 80) return "Elevated BP";
    if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return "Stage 1 Hypertension";
    if (systolic >= 140 || diastolic >= 90) return "Stage 2 Hypertension";
    return "Unclassified BP";
};

const measureBS = (fastingBloodSugar) => {
    if (fastingBloodSugar < 100) return "Normal";
    if (fastingBloodSugar >= 100 && fastingBloodSugar <= 125) return "Prediabetes";
    if (fastingBloodSugar >= 126) return "Diabetes";
    return "Unclassified";
};

const measureCL = (cholesterolSerum) => {
    if (cholesterolSerum >= 125 && cholesterolSerum <= 200) return "Optimal";
    if (cholesterolSerum > 200 && cholesterolSerum <= 239) return "Borderline High";
    if (cholesterolSerum >= 240) return "High";
    return "Hypocholesterolemia";
};

const measureBMI = (weight, height) => {
    const bmi = weight / (height * height);
    if (bmi < 18.5) return "Underweight";
    if (bmi >= 18.5 && bmi <= 24.9) return "Normal weight";
    if (bmi >= 25.0 && bmi <= 29.9) return "Pre-obesity";
    if (bmi >= 30.0 && bmi <= 34.9) return "Obesity Class I";
    if (bmi >= 35.0 && bmi <= 39.9) return "Obesity Class II";
    if (bmi >= 40.0) return "Obesity Class III";
    return "Invalid input";
};

// --- Main Route Handler ---
const updateMetrics = async (req, res) => {
    const userId = req.user.user_id;
    const { riskId, value1, value2 } = req.body;

    let readingType = "";
    let readingCategory = "";
    let riskPresence = false;

    // 1. Determine Category & Risk
    switch (riskId) {
        case 1:
            readingType = "Blood Sugar";
            readingCategory = measureBS(value1);
            riskPresence = (readingCategory === "Prediabetes" || readingCategory === "Diabetes");
            break;
        case 2:
            readingType = "Blood Pressure";
            readingCategory = measureBP(value1, value2);
            riskPresence = (readingCategory === "Stage 2 Hypertension");
            break;
        case 3:
            readingType = "Cholesterol Level";
            readingCategory = measureCL(value1);
            riskPresence = (readingCategory === "High");
            break;
        case 5:
            readingType = "BMI";
            readingCategory = measureBMI(value1, value2);
            riskPresence = (readingCategory.includes("Obesity") || readingCategory === "Pre-obesity");
            break;
        default:
            return res.status(400).json({ error: "Invalid risk ID" });
    }

    // 2. Database Transaction
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Upsert into HEALTH_METRICS
        const existingMetric = await client.query(
            `SELECT * FROM health_metrics WHERE user_id = $1 AND reading_type = $2`,
            [userId, readingType]
        );

        if (existingMetric.rows.length === 0) {
            await client.query(
                `INSERT INTO health_metrics (user_id, reading_type, health_reading_category, last_update)
                 VALUES ($1, $2, $3, NOW())`,
                [userId, readingType, readingCategory]
            );
        } else {
            await client.query(
                `UPDATE health_metrics SET health_reading_category = $1, last_update = NOW()
                 WHERE user_id = $2 AND reading_type = $3`,
                [readingCategory, userId, readingType]
            );
        }

        // Update USER_RISK_FACTOR
        await client.query(
            `UPDATE user_risk_factor SET bool_risk_presence = $1, last_update = NOW()
             WHERE user_id = $2 AND risk_id = $3`,
            [riskPresence, userId, riskId]
        );

        await client.query('COMMIT');
        
        // Return the calculated category so the Flutter UI can update instantly
        res.status(200).json({ 
            success: true, 
            message: "Metrics updated", 
            category: readingCategory,
            riskDetected: riskPresence
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Health Metrics Update Error:", error);
        res.status(500).json({ error: "Failed to update health metrics" });
    } finally {
        client.release();
    }
};

module.exports = { updateMetrics };