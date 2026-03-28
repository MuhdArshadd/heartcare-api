const admin = require('firebase-admin');
const pool = require('../config/db');

// Note: You will need to download your Firebase Service Account JSON file 
// from the Firebase Console and place it in your backend folder.
// const serviceAccount = require('../firebase-service-account.json');

// // Initialize the Firebase Admin SDK
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// Maps to: Family Pokes (Cross-device notifications)
const sendFamilyPoke = async (req, res) => {
    const senderId = req.user.user_id; // The person tapping the button
    const { targetUserId } = req.body; // The family member receiving the poke

    try {
        // 1. Get the Sender's Name so the notification says "John poked you!"
        const senderResult = await pool.query(
            'SELECT fullname FROM USERS WHERE user_id = $1', 
            [senderId]
        );
        const senderName = senderResult.rows[0].fullname || "A family member";

        // 2. Get the Target's FCM Token from the database
        const targetResult = await pool.query(
            'SELECT fcm_token FROM USERS WHERE user_id = $1', 
            [targetUserId]
        );
        
        if (targetResult.rows.length === 0 || !targetResult.rows[0].fcm_token) {
            return res.status(404).json({ error: "User does not have notifications enabled." });
        }

        const targetToken = targetResult.rows[0].fcm_token;

        // 3. Construct and send the Push Notification via Firebase
        const message = {
            notification: {
                title: 'HeartCare Family Poke 👉',
                body: `${senderName} is checking in on your heart health!`,
            },
            token: targetToken,
        };

        await admin.messaging().send(message);

        res.status(200).json({ success: true, message: "Poke delivered successfully!" });

    } catch (error) {
        console.error("Firebase Messaging Error:", error);
        res.status(500).json({ error: "Failed to send notification" });
    }
};

module.exports = { sendFamilyPoke };