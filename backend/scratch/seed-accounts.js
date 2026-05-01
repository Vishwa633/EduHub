import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../src/models/User.js';
import { connectDB } from '../src/lib/db.js';

const seedAccounts = async () => {
    try {
        await connectDB();
        console.log("Connected to database for seeding...");

        // 1. Create Student Account
        const studentData = {
            username: "student_user",
            email: "student@eduhub.com",
            password: "password123",
            role: "student",
            approvalStatus: "approved"
        };

        let student = await User.findOne({ email: studentData.email });
        if (!student) {
            student = new User(studentData);
            await student.save();
            console.log("✓ Student account created: student@eduhub.com / password123");
        } else {
            console.log("- Student account already exists.");
        }

        // 2. Create Tutor Account
        const tutorData = {
            username: "tutor_user",
            email: "tutor@eduhub.com",
            password: "password123",
            role: "tutor",
            approvalStatus: "approved",
            tutorProfile: {
                fullName: "John Tutor",
                subject: "Mathematics",
                bio: "Expert math tutor with 10 years of experience.",
                mobileNumber: "1234567890",
                price: 50,
                priceType: "per_hour",
                experienceLevel: "expert"
            }
        };

        let tutor = await User.findOne({ email: tutorData.email });
        if (!tutor) {
            tutor = new User(tutorData);
            await tutor.save();
            console.log("✓ Tutor account created: tutor@eduhub.com / password123");
        } else {
            console.log("- Tutor account already exists.");
        }

        console.log("Seeding complete!");
        process.exit(0);
    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seedAccounts();
