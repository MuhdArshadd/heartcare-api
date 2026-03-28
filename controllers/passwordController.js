const pool = require('../config/db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// 1. Setup the email transporter securely on the backend
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USERNAME_GMAIL,
        pass: process.env.PASSWORD_GMAIL
    }
});

const sendResetCode = async (req, res) => {
    const { email_address } = req.body;

    try {
        // Verify user exists
        const userCheck = await pool.query('SELECT * FROM USERS WHERE email_address = $1', [email_address]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: "Invalid User" });
        }

        // Generate 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Send Email
        const mailOptions = {
            from: process.env.USERNAME_GMAIL,
            to: email_address,
            subject: '(HeartCare) Your Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #d32f2f;">HeartCare Password Verification</h2>
                    <p>Your password verification code is:</p>
                    <div style="font-size: 24px; font-weight: bold; color: #333;">${verificationCode}</div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        
        // Return the code to the app so Flutter can verify what the user types
        res.status(200).json({ success: true, code: verificationCode });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send email" });
    }
};

const updatePassword = async (req, res) => {
    const { email_address, new_password } = req.body;
    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(new_password, saltRounds);

        await pool.query(
            'UPDATE USERS SET password = $1 WHERE email_address = $2',
            [passwordHash, email_address]
        );

        res.status(200).json({ success: true, message: "Password update successful." });
    } catch (error) {
        res.status(500).json({ error: "Failed to update password" });
    }
};

module.exports = { sendResetCode, updatePassword };