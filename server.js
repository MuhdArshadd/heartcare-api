require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// 1. Import all route files
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const familyRoutes = require('./routes/familyRoutes');
const healthRoutes = require('./routes/healthRoutes');
const healthMetricsRoutes = require('./routes/healthMetricsRoutes');
const profileRoutes = require('./routes/profileRoutes');
const treatmentRoutes = require('./routes/treatmentRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); 
const predictionRoutes = require('./routes/predictionRoutes'); 

const app = express();

// 2. Global Middleware
app.use(express.json()); // Tells the server to accept JSON data
app.use(cors());         // Allows your Flutter app to communicate with this API
app.use(morgan('dev')); // API monitor

// 3. Mount the routes (Defining the API URLs)
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/treatment', treatmentRoutes);
app.use('/api/symptom', symptomRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/health-metrics', healthMetricsRoutes);

// 4. A professional fallback for 404 errors
app.use((req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
});

// 5. Start the engine
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`HeartCare API is securely running on port ${PORT}`);
});