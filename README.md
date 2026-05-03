# 🎓 EduHub – Smart Learning Platform

## 📌 Project Overview
**EduHub** is a modern full-stack learning platform that connects **students and tutors** in a simple and efficient way.  
Students can discover tutors, book sessions, and manage their learning, while tutors can create sessions and interact with students.

The system also includes an **admin panel** to manage users, monitor activities, and handle support inquiries.

---

## 🚀 Features

### 👨‍🎓 Student
- Browse and search tutors
- Book and manage sessions
- Make secure payments
- View session history
- Save favorite tutors
- Send inquiries to admin

---

### 👨‍🏫 Tutor
- Create and manage sessions
- View bookings
- Manage availability
- Track earnings
- Interact with students

---

### 🛠️ Admin
- Manage users (students & tutors)
- Handle inquiries and support
- Monitor platform activity
- Manage sessions and content

---

## 🧑‍💻 Tech Stack

### 📱 Frontend
- React Native (Expo)
- Expo Router
- React Hooks

### 🌐 Backend
- Node.js
- Express.js

### 🗄️ Database
- MongoDB
- Mongoose

### 🔐 Authentication
- JWT (JSON Web Tokens)

### ☁️ Deployment
- Vercel (Frontend)
- Render (Backend)

### 📱 APK Build

The Expo app is rooted in [mobile/](mobile), so run EAS from that folder:

```bash
cd mobile
npx eas-cli@latest workflow:run .eas/workflows/create-production-builds.yml
```

The mobile folder now has its own [eas.json](mobile/eas.json) and workflow file, so the APK build uses the real app root.

### 🧰 Tools & Services
- Cloudinary (media uploads)
- Git & GitHub (version control)

---
