const pool = require('../config/db');

// Maps to: getFamilyMemberList
const getFamily = async (req, res) => {
    const userId = req.user.user_id;

    try {
        const result = await pool.query(
            `-- Get 'Me'
             SELECT u.user_id, u.fullname, u.temp_latitude, u.temp_longitude, u.fcm_token, cvd.bool_result, true as is_me
             FROM USERS u
             LEFT JOIN CVD_RESULT cvd ON u.user_id = cvd.user_id
             WHERE u.user_id = $1
             
             UNION
             
             -- Get Family
             SELECT u.user_id, u.fullname, u.temp_latitude, u.temp_longitude, u.fcm_token, cvd.bool_result, false as is_me
             FROM FAMILY_MEMBER fm
             JOIN USERS u ON (fm.user_id_1 = u.user_id OR fm.user_id_2 = u.user_id)
             LEFT JOIN CVD_RESULT cvd ON u.user_id = cvd.user_id
             WHERE (fm.user_id_1 = $1 OR fm.user_id_2 = $1) AND u.user_id != $1`,
            [userId]
        );

        res.status(200).json({ success: true, family: result.rows });
    } catch (error) {
        res.status(500).json({ error: "Error fetching family list" });
    }
};

// Maps to: addOrRemoveFamilyMember
const manageFamily = async (req, res) => {
    const userId = req.user.user_id; 
    const { action, targetId } = req.body; // action: 'add' or 'remove', targetId: generated_id (for add) or user_id (for remove)

    try {
        if (action === 'add') {
            const userCheck = await pool.query('SELECT user_id FROM USERS WHERE generated_id = $1', [targetId]);
            if (userCheck.rows.length === 0) return res.status(404).json({ error: "User code not found." });
            
            await pool.query(
                `INSERT INTO FAMILY_MEMBER (user_id_1, user_id_2) VALUES ($1, $2)`,
                [userId, userCheck.rows[0].user_id]
            );
            return res.status(200).json({ success: true, message: "Family member added." });
        
        } else if (action === 'remove') {
            await pool.query(
                `DELETE FROM FAMILY_MEMBER WHERE (user_id_1 = $1 AND user_id_2 = $2) OR (user_id_1 = $2 AND user_id_2 = $1)`,
                [userId, targetId]
            );
            return res.status(200).json({ success: true, message: "Family member removed." });
        }
    } catch (error) {
        res.status(500).json({ error: "Error managing family" });
    }
};

module.exports = { getFamily, manageFamily };