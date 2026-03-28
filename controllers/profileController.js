const pool = require('../config/db');

// Maps to: userCompleteProfile & updateUserInfo
const updateProfile = async (req, res) => {
    const userId = req.user.user_id; 
    const { 
        age, sex, body_weight, height, family_history_cvd, 
        ethnicity_group, marital_status, employment_status, education_level, 
        profile_image 
    } = req.body;

    try {
        await pool.query(
            `UPDATE USERS 
             SET 
                age = COALESCE($1, age), 
                sex = COALESCE($2, sex), 
                body_weight = COALESCE($3, body_weight), 
                height = COALESCE($4, height), 
                family_history_cvd = COALESCE($5, family_history_cvd),
                ethnicity_group = COALESCE($6, ethnicity_group), 
                marital_status = COALESCE($7, marital_status), 
                employment_status = COALESCE($8, employment_status), 
                education_level = COALESCE($9, education_level),
                profile_image = COALESCE($10, profile_image)
             WHERE user_id = $11`, 
            [
                age ?? null, 
                sex ?? null, 
                body_weight ?? null, 
                height ?? null, 
                family_history_cvd ?? null, 
                ethnicity_group ?? null, 
                marital_status ?? null, 
                employment_status ?? null, 
                education_level ?? null, 
                profile_image ?? null,
                userId 
            ]
        );
        res.status(200).json({ success: true, message: "Profile updated successfully." });
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ error: "Error updating profile" });
    }
};

// Maps to: updateLocation
const updateLocation = async (req, res) => {
    const userId = req.user.user_id;
    const { latitude, longitude } = req.body;

    try {
        await pool.query(
            `UPDATE USERS SET temp_latitude = $1, temp_longitude = $2 WHERE user_id = $3`,
            [latitude, longitude, userId]
        );
        res.status(200).json({ success: true, message: "Location updated." });
    } catch (error) {
        res.status(500).json({ error: "Error updating location" });
    }
};

// Add this to your profileController.js
const updateFcmToken = async (req, res) => {
    const userId = req.user.user_id;
    const { fcm_token } = req.body;

    try {
        await pool.query(
            `UPDATE USERS SET fcm_token = $1 WHERE user_id = $2`,
            [fcm_token, userId]
        );
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error updating FCM token" });
    }
};


module.exports = { updateProfile, updateLocation, updateFcmToken };