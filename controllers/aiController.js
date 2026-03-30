const axios = require('axios');
const pool = require('../config/db');

const OPENAI_URL = 'https://api.openai.com/v1/responses'; // Using your provided endpoint format
const MODEL = 'gpt-4.1-mini-2025-04-14';

// Helper to set up headers
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_KEY}`
});

// --- 1. CHATBOT ROUTER ---
const runConversation = async (req, res) => {
    const { message } = req.body;

    const systemPrompt = `
        You are a chatbot for the HeartCare mobile app, designed to assist users with health management, symptom tracking, medication reminders, and general app-related inquiries.
        
        Follow these rules:
        1. Use the 'handle_general_app_info_question' function for general app-related queries, greetings, and casual interactions.
        2. Use the 'handle_user_health_question' function when the user asks about or expresses concerns related to heart health, symptoms, risk factors, clinical readings, or cardiovascular disease.
        3. Only call a function if the user's request is relevant to it. If no function is applicable, respond conversationally without invoking a function.
    `;

    const tools = [
        {
            type: "function",
            name: "handle_general_app_info_question",
            description: "Handles general inquiries about the HeartCare app, greetings, and app functionality.",
            strict: true,
            parameters: {
                type: "object",
                properties: { content: { type: "string" } },
                required: ["content"],
                additionalProperties: false
            }
        },
        {
            type: "function",
            name: "handle_user_health_question",
            description: "Handles user questions, concerns, or statements specifically related to cardiovascular health.",
            strict: true,
            parameters: {
                type: "object",
                properties: { content: { type: "string" } },
                required: ["content"],
                additionalProperties: false
            }
        }
    ];

    try {
        const response = await axios.post(OPENAI_URL, {
            model: MODEL,
            input: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            tools: tools,
            tool_choice: "auto"
        }, { headers: getHeaders() });

        const responseMessage = response.data.output[0];

        // Did OpenAI decide to call a function?
        if (responseMessage.type === 'function_call' && responseMessage.status === 'completed') {
            const functionName = responseMessage.name;
            const functionArgs = JSON.parse(responseMessage.arguments);

            // Route to the appropriate sub-prompt
            if (functionName === 'handle_general_app_info_question') {
                return await handleGeneralAppInfo(functionArgs.content, res);
            } else if (functionName === 'handle_user_health_question') {
                return await handleUserHealth(functionArgs.content, res);
            }
        }

        // Default response
        res.status(200).json({ 
            success: true, 
            reply: "I'm sorry, I can only assist with questions related to the app's features and functionalities." 
        });

    } catch (error) {
        console.error("OpenAI Router Error:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to process conversation" });
    }
};

// --- Sub-Prompt: General Info ---
const handleGeneralAppInfo = async (content, res) => {
    const prompt = `
        You are a knowledgeable and concise assistant dedicated to answering questions about the HeartCare app. 
        - Provide answers in a concise and clear format. 
        - Do not use emojis, font styles (e.g., bold, italics), or other visual embellishments.
        - Avoid over-explaining.
        User's question: "${content}"
    `;

    try {
        const response = await axios.post(OPENAI_URL, {
            model: MODEL,
            input: [{ role: "system", content: prompt }],
            tools: [{ type: "file_search", vector_store_ids: ["vs_68317c10b754819182b9a0595525f21d"] }],
            tool_choice: "required"
        }, { headers: getHeaders() });

        const output = response.data.output.find(item => item.type === 'message');
        const textItem = output.content.find(item => item.type === 'output_text');

        res.status(200).json({ success: true, reply: textItem ? textItem.text : "No response found." });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch general info" });
    }
};

// --- Sub-Prompt: Health Question ---
const handleUserHealth = async (content, res) => {
    const prompt = `
        You are a knowledgeable, compassionate assistant dedicated to helping users understand and manage their cardiovascular health.
        - Provide evidence-based information and practical self-care suggestions without over-promising outcomes.
        - Always reassure the provided answers is AI generated and best for user to consult a qualified healthcare professional.
        - Do not use emojis, font styles (e.g., bold, italics), or other visual embellishments.
        The user asked: "${content}"
    `;

    try {
        const response = await axios.post(OPENAI_URL, {
            model: MODEL,
            input: [{ role: "system", content: prompt }]
        }, { headers: getHeaders() });

        const reply = response.data.output[0].content[0].text;
        res.status(200).json({ success: true, reply });
    } catch (error) {
        res.status(500).json({ error: "Failed to process health question" });
    }
};

// --- 2. GENERATE AI TREATMENT ---
const generateTreatment = async (req, res) => {
    const userId = req.user.user_id;

    try {
        // We let the backend fetch all the context safely from the DB!
        // 1. Get CVD Level
        const cvdResult = await pool.query(`SELECT bool_result FROM CVD_RESULT WHERE user_id = $1 ORDER BY recorded_at DESC LIMIT 1`, [userId]);
        const cvdLevelDetection = cvdResult.rows.length > 0 ? (cvdResult.rows[0].bool_result ? "High Risk" : "Low Risk") : "Unidentified";

        // 2. Get Active Symptoms
        const symptomsResult = await pool.query(
            `SELECT s.symptom_name FROM SYMPTOM s JOIN USER_SYMPTOM us ON s.symptom_id = us.symptom_id WHERE us.user_id = $1 AND us.bool_symptom_active = true`, [userId]
        );
        const activeSymptomsList = symptomsResult.rows.map(r => `- ${r.symptom_name}`).join('\n') || "- None";

        // 3. Get CVD Risks
        const risksResult = await pool.query(
            `SELECT crf.cvd_risk_name, urf.bool_risk_presence FROM USER_RISK_FACTOR urf JOIN CVD_RISK_FACTOR crf ON crf.risk_id = urf.risk_id WHERE urf.user_id = $1`, [userId]
        );
        const cvdPresencesList = risksResult.rows.map(r => `- ${r.cvd_risk_name}: ${r.bool_risk_presence ? 'Present' : 'Not Present'}`).join('\n');

        const treatmentSchema = `
        {
          "category": "Must be one of: 'Medication', 'Supplement', 'Diet', or 'Physical Activity'.",
          "name": "Name of the treatment",
          "dosage": "REQUIRED ONLY IF category is 'Medication' or 'Supplement'. Must be numeric.",
          "unit": "REQUIRED ONLY IF category is 'Medication' or 'Supplement'. (e.g., 'mg', 'ml')",
          "quantity": "REQUIRED ONLY IF category is 'Medication' or 'Supplement'. Must be integer.",
          "type": "REQUIRED ONLY IF category is 'Medication' or 'Supplement'. (e.g., 'Tablet')",
          "description": "Short explanation",
          "timesOfDay": ["'Morning', 'Afternoon', 'Evening', 'Night'"]  
        }`;

        const prompt = `
        You are an AI healthcare assistant specialized in cardiovascular disease (CVD) management.
        Generate personalized treatment recommendations based on the following context.
        
        ### FORMAT:
        All outputs must strictly follow the JSON array format shown below. Do not include any explanations outside the JSON.
        [${treatmentSchema}]
        
        ### CONTEXT:
        2. CVD Risk Factors:
        ${cvdPresencesList}
        
        3. Active Symptoms:
        ${activeSymptomsList}
        
        4. CVD Risk Score:
        ${cvdLevelDetection}
        
        ### INSTRUCTIONS:
        - Suggest 0, 1, or more treatments per time of day.
        - Only return a valid JSON array.
        - Keep the treatment description under 150 characters.
        `;

        const response = await axios.post(OPENAI_URL, {
            model: MODEL,
            input: [{ role: "system", content: prompt }],
            tools: [{ type: "file_search", vector_store_ids: ["vs_6831df8add9881919d7de3444ce3e071"] }],
            tool_choice: "required",
            temperature: 0.2
        }, { headers: getHeaders() });

        const output = response.data.output.find(item => item.type === 'message');
        const textItem = output.content.find(item => item.type === 'output_text');
        
        let rawText = textItem.text;

        const startIndex = rawText.indexOf('[');
        const endIndex = rawText.lastIndexOf(']');

        if (startIndex !== -1 && endIndex !== -1) {
            // Extract everything from the first '[' to the last ']'
            rawText = rawText.substring(startIndex, endIndex + 1);
        } else {
            throw new Error("AI did not return a valid JSON array format.");
        }
        // Parse the cleaned text into a literal JSON array
        const treatmentJson = JSON.parse(rawText);

        res.status(200).json({ success: true, data: treatmentJson });

    } catch (error) {
        console.error("AI Treatment Error:", error.message);
        res.status(500).json({ error: "Failed to generate treatments" });
    }
};

module.exports = { runConversation, generateTreatment };