# ⚙️ HeartCare Node.js REST API

> **📱 Mobile Application:** This API serves the award-winning HeartCare Flutter application, which can be found [here](https://github.com/MuhdArshadd/HeartCare).

This repository contains the backend infrastructure for the HeartCare mobile application. It is a secure, highly-scalable REST API built with Node.js and Express, migrating away from legacy Azure instances to a modern Supabase PostgreSQL architecture. 

## 🏗️ Architecture Highlights
* **RESTful API Design:** Implements clean, stateless routing and modular controllers to handle high-volume requests from the mobile client efficiently.
* **Robust Authentication & Security:** Secures all user data and API endpoints using custom middleware powered by JSON Web Tokens (JWT) and `bcrypt` password hashing.
* **Cross-Device Push Notifications:** Integrates the Firebase Admin SDK to act as a secure broker for real-time "Pokes" and alert triggers between family members' Android devices.
* **Database Connection Pooling:** Utilizes `pg` and connection pooling to ensure database stability and rapid query execution under concurrent load, communicating securely with Supabase.

## 🛠️ Tech Stack & Dependencies
* **Core Framework:** Node.js & `express`
* **Database:** PostgreSQL via `pg` (Hosted on Supabase)
* **Security & Authentication:** * `jsonwebtoken` (Stateless Auth)
  * `bcrypt` (Credential Hashing)
  * `cors` (Cross-Origin Resource Sharing)
* **External Services & APIs:**
  * `firebase-admin` (Push Notification Brokering)
  * `axios` (External API Routing)
  * `nodemailer` (Automated Email Services)
  * OpenAI API
* **Environment & Logging:** `dotenv` (Environment Variables), `morgan` (HTTP Request Logging)

## 🚀 Deployment
This API is actively deployed and hosted on **Render**, utilizing their web service architecture for continuous deployment and secure environment variable management.