import express from 'express';
import User from '../models/User.js';
import InAppNotification from '../models/InAppNotification.js';
import jwt from 'jsonwebtoken';
import protectRoute from '../middleware/auth.middleware.js';
import cloudinary from '../lib/cloudinary.js';

const router = express.Router();

const generateToken = (userId) => {
   return jwt.sign({userId}, process.env.JWT_SECRET, { expiresIn: '15d' });
}

// Phone number validation function
const isValidPhoneNumber = (phone) => {
    const normalized = String(phone || "").trim().replace(/\s+/g, "");
    return /^(07\d{8}|\+947\d{8}|947\d{8})$/.test(normalized);
};

// Email validation function
const isValidEmail = (email) => {
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   return emailRegex.test(email);
};

const isValidSriLankanNic = (nic) => {
    const normalized = String(nic || "").trim();
    return /^(\d{9}[vVxX]|\d{12})$/.test(normalized);
};

const uploadImageIfBase64 = async (image, folder) => {
    const value = String(image || "").trim();
    if (!value) {
        return "";
    }

    if (!value.startsWith("data:image")) {
        return value;
    }

    const uploadResponse = await cloudinary.uploader.upload(value, { folder });
    return uploadResponse.secure_url;
};

const WEEK_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];

const timeToMinutes = (time) => {
    const match = String(time || "").match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/i);
    if (!match) {
        return NaN;
    }

    let hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    const period = match[3].toUpperCase();

    if (hour === 12) {
        hour = period === "AM" ? 0 : 12;
    } else if (period === "PM") {
        hour += 12;
    }

    return hour * 60 + minute;
};

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, tutorProfile, profileImage } = req.body;
        const normalizedRole = ["student", "tutor", "admin"].includes(String(role || "").toLowerCase())
            ? String(role || "").toLowerCase()
            : "student";
        const normalizedUsername = String(username || "").trim();
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (normalizedRole === "admin") {
            return res.status(403).json({ message: "Admin accounts can only be created by the server" });
        }

        if(!normalizedUsername || !normalizedEmail || !password){
            return res.status(400).json({ message: "All fields are required" });
        }

        if(password.length < 6){
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        if(normalizedUsername.length < 3){
            return res.status(400).json({ message: "Username must be at least 3 characters" });
        }

        // Validate email format
        if(!isValidEmail(normalizedEmail)){
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        // Validate tutor fields if role is tutor
        if(normalizedRole === "tutor"){
            if(!tutorProfile || !tutorProfile.fullName || !tutorProfile.subject || !tutorProfile.bio || !tutorProfile.mobileNumber || !tutorProfile.experienceLevel || tutorProfile.age === undefined || tutorProfile.price === undefined || !tutorProfile.priceType || !Array.isArray(tutorProfile.availability) || tutorProfile.availability.length === 0){
                return res.status(400).json({ message: "All tutor details are required" });
            }

            if(!String(profileImage || "").trim()){
                return res.status(400).json({ message: "Profile photo is required" });
            }

            if(tutorProfile.fullName.length < 3){
                return res.status(400).json({ message: "Please enter a valid full name" });
            }

            // Validate phone number
            if(!isValidPhoneNumber(tutorProfile.mobileNumber)){
                return res.status(400).json({ message: "Please enter a valid phone number (at least 7 digits)" });
            }

            if(tutorProfile.subject.length < 2){
                return res.status(400).json({ message: "Please enter a valid subject" });
            }

            if(tutorProfile.bio.length < 10){
                return res.status(400).json({ message: "Bio must be at least 10 characters" });
            }

            // Validate experience level
            if(!["beginner", "intermediate", "expert"].includes(tutorProfile.experienceLevel)){
                return res.status(400).json({ message: "Please select a valid experience level" });
            }

            // Validate age
            const ageNum = Number(tutorProfile.age);
            if(isNaN(ageNum) || ageNum <= 0 || ageNum > 100){
                return res.status(400).json({ message: "Please enter a valid age between 1 and 100" });
            }

            // Validate price
            const priceNum = Number(tutorProfile.price);
            if(isNaN(priceNum) || priceNum <= 0){
                return res.status(400).json({ message: "Please enter a valid price greater than 0" });
            }

            // Validate price type
            if(!["per_hour", "per_session"].includes(tutorProfile.priceType)){
                return res.status(400).json({ message: "Please select a valid price type" });
            }

            // Validate availability structure
            const invalidAvailability = tutorProfile.availability.find((slot) => {
                if(!slot){
                    return true;
                }

                const dayIsValid = WEEK_DAYS.includes(slot.day);
                const fromMinutes = timeToMinutes(slot.from);
                const toMinutes = timeToMinutes(slot.to);
                return !dayIsValid || Number.isNaN(fromMinutes) || Number.isNaN(toMinutes) || fromMinutes >= toMinutes;
            });

            if(invalidAvailability){
                return res.status(400).json({ message: "Please provide valid availability days and time ranges" });
            }

            const documentType = String(tutorProfile.kyc?.documentType || "").trim().toLowerCase();
            if(!["nic", "passport"].includes(documentType)){
                return res.status(400).json({ message: "Please select NIC or passport for verification" });
            }

            if(documentType === "nic"){
                if(!isValidSriLankanNic(tutorProfile.kyc?.nicNumber)){
                    return res.status(400).json({ message: "Please enter a valid NIC number" });
                }

                if(!String(tutorProfile.kyc?.nicFrontImage || "").trim() || !String(tutorProfile.kyc?.nicBackImage || "").trim()){
                    return res.status(400).json({ message: "NIC front and back images are required" });
                }
            }

            if(documentType === "passport"){
                if(!String(tutorProfile.kyc?.passportNumber || "").trim()){
                    return res.status(400).json({ message: "Passport number is required" });
                }

                if(!String(tutorProfile.kyc?.passportImage || "").trim()){
                    return res.status(400).json({ message: "Passport image is required" });
                }
            }

            tutorProfile.availability = tutorProfile.availability
                .filter((slot) => WEEK_DAYS.includes(slot.day))
                .map((slot) => ({
                    day: slot.day,
                    from: slot.from,
                    to: slot.to,
                    isAvailable: true,
                }));

            // Normalize numeric values before saving
            tutorProfile.age = ageNum;
            tutorProfile.price = priceNum;
            tutorProfile.kyc = {
                documentType,
                nicNumber: documentType === "nic" ? String(tutorProfile.kyc?.nicNumber || "").trim() : "",
                passportNumber: documentType === "passport" ? String(tutorProfile.kyc?.passportNumber || "").trim() : "",
                nicFrontImage: documentType === "nic"
                    ? await uploadImageIfBase64(tutorProfile.kyc?.nicFrontImage, "bookworm/kyc")
                    : "",
                nicBackImage: documentType === "nic"
                    ? await uploadImageIfBase64(tutorProfile.kyc?.nicBackImage, "bookworm/kyc")
                    : "",
                passportImage: documentType === "passport"
                    ? await uploadImageIfBase64(tutorProfile.kyc?.passportImage, "bookworm/kyc")
                    : "",
            };
        }

        //check if user already exists
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if(existingEmail){
            return res.status(400).json({ message: "Email already exists" });
        }

        const existingUsername = await User.findOne({ username: normalizedUsername });
        if(existingUsername){
            return res.status(400).json({ message: "Username already exists" });
        }

        //get random avatar when no explicit image is provided
        const nextProfileImage = String(profileImage || "").trim()
            ? await uploadImageIfBase64(profileImage, "bookworm/profiles")
            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedUsername}`;

        const user = new User({ 
            username: normalizedUsername,
            email: normalizedEmail,
            password,
            profileImage: nextProfileImage,
            role: normalizedRole,
            isActive: normalizedRole === "tutor" ? false : true,
            approvalStatus: normalizedRole === "tutor" ? "pending" : "approved",
            rejectionReason: "",
            tutorProfile: normalizedRole === "tutor" ? tutorProfile : undefined,
        });

        await user.save();

        if (normalizedRole === "tutor") {
            try {
                const admins = await User.find({ role: "admin" }).select("_id").lean();
                if (admins.length > 0) {
                    await InAppNotification.insertMany(
                        admins.map((admin) => ({
                            user: admin._id,
                            type: "system",
                            level: "warning",
                            title: "New Tutor Signup Request",
                            message: `${normalizedUsername} submitted a tutor signup request. Review and activate the account.`,
                            deliveredAt: new Date(),
                        }))
                    );
                }
            } catch (notificationError) {
                console.error("Error creating admin tutor signup notifications:", notificationError);
            }
        }

        const token = generateToken(user._id);

        const isTutorPendingApproval = normalizedRole === "tutor";

        res.status(201).json({
            message: isTutorPendingApproval
                ? "Tutor account submitted. Admin review and activation usually takes 1-2 days."
                : "Account created successfully.",
            pendingApproval: isTutorPendingApproval,
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                role: user.role,
                isActive: user.isActive,
                approvalStatus: user.approvalStatus,
                rejectionReason: user.rejectionReason,
                tutorProfile: user.tutorProfile,
                createdAt: user.createdAt,
            },
        });

    } catch (error) {
        console.error("Error in register route:", error);
        res.status(500).json({ message: "Internal Server error", error: error.message });
    }
});


router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const identifier = String(email || "").trim();
        const normalizedEmail = identifier.toLowerCase();

        if(!identifier || !password){
            console.warn("[LOGIN] Missing identifier or password");
            return res.status(400).json({ message: "All fields are required" });
        }

        // Allow login with either email or username.
        const escapedIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const user = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { username: { $regex: `^${escapedIdentifier}$`, $options: 'i' } },
            ],
        });

        if(!user){
            console.warn(`[LOGIN] User not found for identifier: ${identifier}`);
            return res.status(400).json({ message: "Invalid credentials" });
        }

        //check if password is correct
        const isPasswordCorrect = await user.comparePassword(password);
        if(!isPasswordCorrect){
            console.warn(`[LOGIN] Invalid password for user: ${user.username}`);
            return res.status(400).json({ message: "Invalid credentials" });
        }

        if (user.isActive === false) {
            console.warn(`[LOGIN] Deactivated user attempted login: ${user.username}`);
            return res.status(403).json({ message: "Your account is deactivated. Please contact support." });
        }

        if (user.role === "tutor" && user.approvalStatus === "rejected") {
            return res.status(403).json({
                message: user.rejectionReason
                    ? `Your tutor account was rejected. Reason: ${user.rejectionReason}`
                    : "Your tutor account was rejected by admin review.",
            });
        }

        //generate token
        const token = generateToken(user._id);

        res.status(200).json({
            message: user.role === "tutor" && user.approvalStatus === "pending"
                ? "Your tutor account is pending admin approval. You can log in, but tutor access will unlock after activation."
                : "Login successful",
            pendingApproval: user.role === "tutor" && user.approvalStatus === "pending",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileImage: user.profileImage,
                role: user.role,
                isActive: user.isActive,
                approvalStatus: user.approvalStatus,
                rejectionReason: user.rejectionReason,
                tutorProfile: user.tutorProfile,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Error in login route:", error);
        res.status(500).json({ message: "Internal Server error", error: error.message });
    }
});

router.put('/profile', protectRoute, async (req, res) => {
    try {
        const { username, email, profileImage, tutorProfile, password } = req.body || {};
        const userDoc = await User.findById(req.user._id);

        if (!userDoc) {
            return res.status(404).json({ message: 'User not found. Please login again.' });
        }

        const nextUsername = String(username || userDoc.username || '').trim();
        const nextEmail = String(email || userDoc.email || '').trim().toLowerCase();

        if (!nextUsername || nextUsername.length < 3) {
            return res.status(400).json({ message: 'Username must be at least 3 characters' });
        }

        if (!nextEmail || !isValidEmail(nextEmail)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        const usernameOwner = await User.findOne({ username: nextUsername });
        if (usernameOwner && usernameOwner._id.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const emailOwner = await User.findOne({ email: nextEmail });
        if (emailOwner && emailOwner._id.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        let nextProfileImage = userDoc.profileImage;
        const incomingProfileImage = typeof profileImage === 'string' ? profileImage.trim() : '';

        if (incomingProfileImage) {
            if (incomingProfileImage.startsWith('data:image')) {
                const uploadResult = await cloudinary.uploader.upload(incomingProfileImage, {
                    folder: 'bookworm/profiles',
                    resource_type: 'image',
                });
                nextProfileImage = uploadResult.secure_url;
            } else {
                nextProfileImage = incomingProfileImage;
            }
        }

        userDoc.username = nextUsername;
        userDoc.email = nextEmail;
        userDoc.profileImage = nextProfileImage;

        if (typeof password === 'string' && password.trim()) {
            if (password.trim().length < 6) {
                return res.status(400).json({ message: 'Password must be at least 6 characters' });
            }
            userDoc.password = password.trim();
        }

        if (userDoc.role === 'tutor' && tutorProfile && typeof tutorProfile === 'object') {
            const currentTutorProfile = userDoc.tutorProfile || {};
            const mergedTutorProfile = {
                ...currentTutorProfile,
                ...tutorProfile,
            };

            mergedTutorProfile.fullName = String(mergedTutorProfile.fullName || '').trim();
            mergedTutorProfile.subject = String(mergedTutorProfile.subject || '').trim();
            mergedTutorProfile.bio = String(mergedTutorProfile.bio || '').trim();
            mergedTutorProfile.mobileNumber = String(mergedTutorProfile.mobileNumber || '').trim();

            if (mergedTutorProfile.fullName && mergedTutorProfile.fullName.length < 3) {
                return res.status(400).json({ message: 'Please enter a valid full name' });
            }

            if (mergedTutorProfile.subject && mergedTutorProfile.subject.length < 2) {
                return res.status(400).json({ message: 'Please enter a valid subject' });
            }

            if (mergedTutorProfile.bio && mergedTutorProfile.bio.length < 10) {
                return res.status(400).json({ message: 'Bio must be at least 10 characters' });
            }

            if (mergedTutorProfile.mobileNumber && !isValidPhoneNumber(mergedTutorProfile.mobileNumber)) {
                return res.status(400).json({ message: 'Please enter a valid phone number (07XXXXXXXX or +947XXXXXXXX)' });
            }

            if (mergedTutorProfile.experienceLevel && !["beginner", "intermediate", "expert"].includes(mergedTutorProfile.experienceLevel)) {
                return res.status(400).json({ message: 'Please select a valid experience level' });
            }

            if (mergedTutorProfile.priceType && !["per_hour", "per_session"].includes(mergedTutorProfile.priceType)) {
                return res.status(400).json({ message: 'Please select a valid price type' });
            }

            if (mergedTutorProfile.age !== undefined && mergedTutorProfile.age !== null && mergedTutorProfile.age !== '') {
                const ageNum = Number(mergedTutorProfile.age);
                if (Number.isNaN(ageNum) || ageNum <= 0 || ageNum > 100) {
                    return res.status(400).json({ message: 'Please enter a valid age between 1 and 100' });
                }
                mergedTutorProfile.age = ageNum;
            }

            if (mergedTutorProfile.price !== undefined && mergedTutorProfile.price !== null && mergedTutorProfile.price !== '') {
                const priceNum = Number(mergedTutorProfile.price);
                if (Number.isNaN(priceNum) || priceNum <= 0) {
                    return res.status(400).json({ message: 'Please enter a valid price greater than 0' });
                }
                mergedTutorProfile.price = priceNum;
            }

            if (Array.isArray(mergedTutorProfile.availability)) {
                const invalidAvailability = mergedTutorProfile.availability.find((slot) => {
                    if (!slot) {
                        return true;
                    }

                    const dayIsValid = WEEK_DAYS.includes(slot.day);
                    const fromMinutes = timeToMinutes(slot.from);
                    const toMinutes = timeToMinutes(slot.to);
                    return !dayIsValid || Number.isNaN(fromMinutes) || Number.isNaN(toMinutes) || fromMinutes >= toMinutes;
                });

                if (invalidAvailability) {
                    return res.status(400).json({ message: 'Please provide valid availability days and time ranges' });
                }

                mergedTutorProfile.availability = mergedTutorProfile.availability
                    .filter((slot) => WEEK_DAYS.includes(slot.day))
                    .map((slot) => ({
                        day: slot.day,
                        from: slot.from,
                        to: slot.to,
                        isAvailable: true,
                    }));
            }

            // Normalize legacy KYC values to avoid enum validation crashes on profile save.
            const kyc = mergedTutorProfile.kyc && typeof mergedTutorProfile.kyc === 'object' ? mergedTutorProfile.kyc : {};
            const docType = String(kyc.documentType || '').trim().toLowerCase();
            const hasValidDocType = ['nic', 'passport'].includes(docType);

            mergedTutorProfile.kyc = {
                documentType: hasValidDocType ? docType : undefined,
                nicNumber: String(kyc.nicNumber || '').trim(),
                passportNumber: String(kyc.passportNumber || '').trim(),
                nicFrontImage: String(kyc.nicFrontImage || '').trim(),
                nicBackImage: String(kyc.nicBackImage || '').trim(),
                passportImage: String(kyc.passportImage || '').trim(),
            };

            userDoc.tutorProfile = mergedTutorProfile;
        }

        await userDoc.save();

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: userDoc._id,
                username: userDoc.username,
                email: userDoc.email,
                profileImage: userDoc.profileImage,
                role: userDoc.role,
                tutorProfile: userDoc.tutorProfile,
                createdAt: userDoc.createdAt,
            },
        });
    } catch (error) {
        console.error('Error in update profile route:', error);
        if (error?.name === 'ValidationError') {
            const firstValidationMessage = Object.values(error.errors || {})[0]?.message;
            return res.status(400).json({ message: firstValidationMessage || error.message || 'Validation failed' });
        }
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

// Verify token endpoint
router.get('/me', protectRoute, async (req, res) => {
    try {
        res.status(200).json({
            user: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                profileImage: req.user.profileImage,
                role: req.user.role,
                tutorProfile: req.user.tutorProfile,
            },
        });
    } catch (error) {
        res.status(500).json({ message: "Internal Server error" });
    }
});

export default router;