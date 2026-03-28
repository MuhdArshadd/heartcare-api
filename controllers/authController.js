const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // <-- NEW: Added for email

// --- EMAIL SETUP ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USERNAME_GMAIL,
        pass: process.env.PASSWORD_GMAIL
    }
});

// --- 1. REGISTER USER ---
const registerUser = async (req, res) => {
    try {
        // Updated to match the exact payload sent from Flutter's signup_screen.dart
        const { username, email_address, password, fullname, profile_image } = req.body;

        const userCheck = await pool.query(
            'SELECT * FROM USERS WHERE email_address = $1 OR username = $2', 
            [email_address, username]
        );
        
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ error: "Email or Username already exists" });
        }

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = await pool.query(
            `INSERT INTO USERS (username, email_address, password, fullname, profile_image) 
             VALUES ($1, $2, $3, $4, $5) RETURNING user_id, email_address, generated_id`,
            [username, email_address, passwordHash, fullname || null, profile_image || null]
        );

        res.status(201).json({ message: "User registered successfully", user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error during registration" });
    }
};

// --- 2. LOGIN USER ---
const loginUser = async (req, res) => {
    try {
        const { username, password, fcm_token } = req.body; // Flutter sends 'username' in login

        // Using $1 to check both email or username just in case
        const userResult = await pool.query(
            'SELECT * FROM USERS WHERE email_address = $1 OR username = $1', 
            [username] 
        );
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        if (fcm_token) {
            await pool.query(
                'UPDATE USERS SET fcm_token = $1 WHERE user_id = $2',
                [fcm_token, user.user_id]
            );
        }

        const token = jwt.sign(
            { user_id: user.user_id, email: user.email_address }, 
            process.env.JWT_SECRET, 
            { expiresIn: '30d' }
        );

        res.status(200).json({ 
            success: true,
            token: token, 
            user: user 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error during login" });
    }
};

// --- 3. FORGOT PASSWORD (SEND CODE) ---
const sendResetCode = async (req, res) => {
    const { email_address } = req.body;

    try {
        const userCheck = await pool.query('SELECT * FROM USERS WHERE email_address = $1', [email_address]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: "Invalid User" });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

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
        
        res.status(200).json({ success: true, code: verificationCode });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to send email" });
    }
};

// --- 4. RESET PASSWORD (SAVE NEW) ---
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

// Export all four functions!
module.exports = { registerUser, loginUser, sendResetCode, updatePassword };