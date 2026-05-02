import fetch from 'node-fetch';
import 'dotenv/config';

// To run this: 
// 1. Make sure your server is running (npm run dev)
// 2. You need a valid JWT token from your login response
// 3. Update the TOKEN variable below

const TOKEN = "YOUR_JWT_TOKEN_HERE"; 
const API_URL = "http://localhost:3000/api/chatbot/chat";

async function testChatbot() {
    console.log("🚀 Testing EduBot API...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TOKEN}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "user", content: "How do I book a session in EduHub?" }
                ]
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log("✅ API Success!");
            console.log("🤖 EduBot Response:", data.content);
        } else {
            console.log("❌ API Failed!");
            console.log("Status:", response.status);
            console.log("Error:", data);
        }
    } catch (error) {
        console.error("💥 Network Error:", error.message);
    }
}

testChatbot();
