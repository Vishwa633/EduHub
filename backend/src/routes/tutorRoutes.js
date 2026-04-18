

import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import InAppNotification from '../models/InAppNotification.js';
import protectRoute from '../middleware/auth.middleware.js';
import TutorRating from '../models/TutorRating.js';

const router = express.Router();

// Allow students to submit text-only feedback (no rating required)
router.post('/:id/review', protectRoute, async (req, res) => {
    try {
        const { comment } = req.body || {};
        const normalizedComment = String(comment || '').trim();
        if (!normalizedComment) {
            return res.status(400).json({ message: 'Feedback comment is required' });
        }

        const tutor = await User.findOne({ _id: req.params.id, role: 'tutor', approvalStatus: { $ne: 'pending' }, isActive: { $ne: false } }).select('_id');
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        // Save new feedback (allow multiple per student per tutor)
        await TutorRating.create({
            tutor: tutor._id,
            student: req.user._id,
            comment: normalizedComment,
        });

        // Optionally, you can return updated reviews
        let limit = parseInt(req.query.limit);
        if (isNaN(limit) || limit < 1) limit = undefined;
        let reviewsQuery = TutorRating.find({ tutor: tutor._id })
            .sort({ createdAt: -1 })
            .populate('student', 'username profileImage');
        if (limit) {
            reviewsQuery = reviewsQuery.limit(limit);
        }
        const reviews = await reviewsQuery.lean();
        const formattedReviews = reviews.map((review) => ({
            id: review._id,
            name: review.student?.username || 'Student',
            profileImage: review.student?.profileImage || '',
            comment: review.comment || '',
            createdAt: review.createdAt,
        }));

        return res.status(200).json({ message: 'Feedback submitted', reviews: formattedReviews });
    } catch (error) {
        // No need to handle duplicate error, since multiple feedbacks are allowed
        console.error('❌ Error saving tutor feedback:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

const buildRatingSummary = async (tutorIds = []) => {
    if (!Array.isArray(tutorIds) || tutorIds.length === 0) {
        return new Map();
    }

    const normalizedTutorIds = tutorIds
        .filter(Boolean)
        .map((id) => id.toString())
        .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (normalizedTutorIds.length === 0) {
        return new Map();
    }

    const aggregates = await TutorRating.aggregate([
        {
            $match: {
                tutor: { $in: normalizedTutorIds.map((id) => new mongoose.Types.ObjectId(id)) },
            },
        },
        {
            $group: {
                _id: '$tutor',
                average: { $avg: '$rating' },
                count: { $sum: 1 },
                star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
                star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            },
        },
    ]);

    const summaryMap = new Map();
    aggregates.forEach((row) => {
        summaryMap.set(row._id.toString(), {
            average: Number((row.average || 0).toFixed(1)),
            count: row.count || 0,
            breakdown: {
                1: row.star1 || 0,
                2: row.star2 || 0,
                3: row.star3 || 0,
                4: row.star4 || 0,
                5: row.star5 || 0,
            },
        });
    });

    return summaryMap;
};

const emptyRatingSummary = {
    average: 0,
    count: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

router.get('/admin/users', protectRoute, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view users' });
        }

        const requestedRole = String(req.query.role || 'student').trim().toLowerCase();
        if (!['student', 'tutor'].includes(requestedRole)) {
            return res.status(400).json({ message: 'Invalid role. Use student or tutor.' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const users = await User.find({ role: requestedRole })
            .select('_id username email profileImage role isActive approvalStatus rejectionReason tutorProfile.fullName tutorProfile.subject tutorProfile.bio tutorProfile.mobileNumber tutorProfile.availability tutorProfile.age tutorProfile.price tutorProfile.priceType tutorProfile.experienceLevel tutorProfile.yearsOfExperience tutorProfile.kyc createdAt')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalUsers = await User.countDocuments({ role: requestedRole });

        return res.status(200).json({
            users,
            totalUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            role: requestedRole,
        });
    } catch (error) {
        console.error('❌ Error fetching admin users:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

router.patch('/admin/users/:id/status', protectRoute, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can update user status' });
        }

        const { id } = req.params;
        const { isActive } = req.body || {};
        const normalizedIsActive = Boolean(isActive);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const account = await User.findById(id);
        if (!account) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (account.role === 'admin') {
            return res.status(400).json({ message: 'Admin account status cannot be changed here' });
        }

        const wasActive = account.isActive !== false;
        account.isActive = normalizedIsActive;
        await account.save();

        if (!wasActive && normalizedIsActive) {
            try {
                await InAppNotification.create({
                    user: account._id,
                    type: 'system',
                    level: 'info',
                    title: 'Tutor Account Approved',
                    message: 'Your tutor account has been approved. It will now appear on the home page.',
                    deliveredAt: new Date(),
                });
            } catch (notificationError) {
                console.error('❌ Error creating tutor approval notification:', notificationError);
            }
        }

        return res.status(200).json({
            message: `User marked as ${normalizedIsActive ? 'active' : 'inactive'}`,
            user: {
                _id: account._id,
                username: account.username,
                email: account.email,
                role: account.role,
                isActive: account.isActive,
                approvalStatus: account.approvalStatus,
                rejectionReason: account.rejectionReason,
                profileImage: account.profileImage,
                tutorProfile: account.tutorProfile,
                createdAt: account.createdAt,
            },
        });
    } catch (error) {
        console.error('❌ Error updating user status:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

router.get('/admin/pending-tutors/summary', protectRoute, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view pending tutor summary' });
        }

        const pendingCount = await User.countDocuments({ role: 'tutor', approvalStatus: 'pending' });
        const latestPending = await User.find({ role: 'tutor', approvalStatus: 'pending' })
            .select('_id username email tutorProfile.fullName createdAt approvalStatus')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        return res.status(200).json({
            pendingCount,
            latestPending,
        });
    } catch (error) {
        console.error('❌ Error fetching pending tutor summary:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

router.get('/admin/pending-tutors', protectRoute, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view pending tutors' });
        }

        const tutors = await User.find({ role: 'tutor', approvalStatus: 'pending' })
            .select('_id username email profileImage isActive approvalStatus rejectionReason tutorProfile.fullName tutorProfile.subject tutorProfile.bio tutorProfile.mobileNumber tutorProfile.availability tutorProfile.age tutorProfile.price tutorProfile.priceType tutorProfile.experienceLevel tutorProfile.yearsOfExperience tutorProfile.kyc createdAt')
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ tutors });
    } catch (error) {
        console.error('❌ Error fetching pending tutors:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

router.patch('/admin/users/:id/review', protectRoute, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can review tutors' });
        }

        const { id } = req.params;
        const decision = String(req.body?.decision || '').trim().toLowerCase();
        const reason = String(req.body?.reason || '').trim();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        if (!['accept', 'reject'].includes(decision)) {
            return res.status(400).json({ message: 'Decision must be accept or reject' });
        }

        const account = await User.findById(id);
        if (!account) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (account.role !== 'tutor') {
            return res.status(400).json({ message: 'Only tutors can be reviewed here' });
        }

        if (decision === 'accept') {
            account.isActive = true;
            account.approvalStatus = 'approved';
            account.rejectionReason = '';
            await account.save();

            try {
                await InAppNotification.create({
                    user: account._id,
                    type: 'system',
                    level: 'info',
                    title: 'Tutor Account Approved',
                    message: 'Your tutor account has been approved. It will now appear on the home page.',
                    deliveredAt: new Date(),
                });
            } catch (notificationError) {
                console.error('❌ Error creating tutor approval notification:', notificationError);
            }

            return res.status(200).json({
                message: 'Tutor approved successfully',
                user: {
                    _id: account._id,
                    username: account.username,
                    email: account.email,
                    role: account.role,
                    isActive: account.isActive,
                    approvalStatus: account.approvalStatus,
                    rejectionReason: account.rejectionReason,
                    profileImage: account.profileImage,
                    tutorProfile: account.tutorProfile,
                    createdAt: account.createdAt,
                },
            });
        }

        account.isActive = false;
        account.approvalStatus = 'rejected';
        account.rejectionReason = reason;
        await account.save();

        try {
            await InAppNotification.create({
                user: account._id,
                type: 'system',
                level: 'critical',
                title: 'Tutor Account Rejected',
                message: reason
                    ? `Your tutor account was rejected. Reason: ${reason}`
                    : 'Your tutor account was rejected by admin review.',
                deliveredAt: new Date(),
            });
        } catch (notificationError) {
            console.error('❌ Error creating tutor rejection notification:', notificationError);
        }

        return res.status(200).json({
            message: 'Tutor rejected successfully',
            user: {
                _id: account._id,
                username: account.username,
                email: account.email,
                role: account.role,
                isActive: account.isActive,
                approvalStatus: account.approvalStatus,
                rejectionReason: account.rejectionReason,
                profileImage: account.profileImage,
                tutorProfile: account.tutorProfile,
                createdAt: account.createdAt,
            },
        });
    } catch (error) {
        console.error('❌ Error reviewing tutor:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

// Get all tutors (paginated)
router.get('/all', protectRoute, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        console.log("🔍 Fetching tutors - Page:", page, "Limit:", limit);

        // Fetch tutors with role = 'tutor' and tutorProfile details
        const tutors = await User.find({ role: 'tutor', approvalStatus: { $ne: 'pending' }, isActive: { $ne: false } })
            .select('_id username email profileImage tutorProfile.fullName tutorProfile.subject tutorProfile.bio tutorProfile.mobileNumber tutorProfile.availability tutorProfile.age tutorProfile.price tutorProfile.priceType tutorProfile.experienceLevel tutorProfile.yearsOfExperience tutorProfile.kyc createdAt')
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination
        const totalTutors = await User.countDocuments({ role: 'tutor', approvalStatus: { $ne: 'pending' }, isActive: { $ne: false } });
        const totalPages = Math.ceil(totalTutors / limit);

        const ratingSummaryMap = await buildRatingSummary(tutors.map((tutor) => tutor._id));
        const tutorsWithRatings = tutors.map((tutor) => ({
            ...tutor,
            ratingSummary: ratingSummaryMap.get(tutor._id.toString()) || emptyRatingSummary,
        }));

        console.log("✅ Found", tutorsWithRatings.length, "tutors");

        res.status(200).json({
            tutors: tutorsWithRatings,
            totalTutors,
            totalPages,
            currentPage: page,
        });

    } catch (error) {
        console.error("❌ Error fetching tutors:", error);
        res.status(500).json({ message: "Internal Server error", error: error.message });
    }
});

// Search tutors by subject
router.get('/search/by-subject', protectRoute, async (req, res) => {
    try {
        const { subject } = req.query;
        
        if (!subject) {
            return res.status(400).json({ message: "Subject parameter is required" });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const tutors = await User.find({
            role: 'tutor',
            approvalStatus: { $ne: 'pending' },
            isActive: { $ne: false },
            'tutorProfile.subject': { $regex: subject, $options: 'i' } // Case-insensitive search
        })
            .select('_id username email profileImage tutorProfile.fullName tutorProfile.subject tutorProfile.bio tutorProfile.mobileNumber tutorProfile.availability tutorProfile.age tutorProfile.price tutorProfile.priceType tutorProfile.experienceLevel tutorProfile.yearsOfExperience tutorProfile.kyc createdAt')
            .skip(skip)
            .limit(limit)
            .lean();

        const totalTutors = await User.countDocuments({
            role: 'tutor',
            approvalStatus: { $ne: 'pending' },
            isActive: { $ne: false },
            'tutorProfile.subject': { $regex: subject, $options: 'i' }
        });

        const ratingSummaryMap = await buildRatingSummary(tutors.map((tutor) => tutor._id));
        const tutorsWithRatings = tutors.map((tutor) => ({
            ...tutor,
            ratingSummary: ratingSummaryMap.get(tutor._id.toString()) || emptyRatingSummary,
        }));

        res.status(200).json({
            tutors: tutorsWithRatings,
            totalTutors,
            totalPages: Math.ceil(totalTutors / limit),
            currentPage: page,
        });

    } catch (error) {
        console.error("❌ Error searching tutors:", error);
        res.status(500).json({ message: "Internal Server error", error: error.message });
    }
});

// Get unique tutor subjects for the home page filter chips
router.get('/subjects', protectRoute, async (req, res) => {
    try {
        const subjects = await User.distinct('tutorProfile.subject', {
            role: 'tutor',
            approvalStatus: { $ne: 'pending' },
            isActive: { $ne: false },
            'tutorProfile.subject': { $type: 'string', $ne: '' },
        });

        const normalizedSubjects = Array.from(
            new Set(
                subjects
                    .map((subject) => String(subject || '').trim())
                    .filter(Boolean),
            ),
        ).sort((left, right) => left.localeCompare(right));

        console.log("📚 Subjects from DB:", subjects);
        console.log("📚 Normalized Subjects:", normalizedSubjects);

        return res.status(200).json({ subjects: normalizedSubjects });
    } catch (error) {
        console.error('❌ Error fetching tutor subjects:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

// DEBUG: Get all tutors with their subjects
router.get('/debug/all-tutors', protectRoute, async (req, res) => {
    try {
        const allTutors = await User.find({ role: 'tutor' })
            .select('_id username tutorProfile.fullName tutorProfile.subject approvalStatus isActive')
            .lean();
        
        console.log(`🔍 DEBUG: Found ${allTutors.length} total tutors`);
        allTutors.forEach((tutor) => {
            console.log(`  - ${tutor.tutorProfile?.fullName || tutor.username}: ${tutor.tutorProfile?.subject} (status: ${tutor.approvalStatus}, active: ${tutor.isActive})`);
        });

        return res.status(200).json({ tutors: allTutors });
    } catch (error) {
        console.error('❌ Error fetching debug tutors:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});


// Get tutor by ID
router.get('/:id', protectRoute, async (req, res) => {
    try {
        const isAdmin = String(req.user?.role || '') === 'admin';
        const tutorQuery = isAdmin
            ? { _id: req.params.id, role: 'tutor' }
            : { _id: req.params.id, role: 'tutor', approvalStatus: { $ne: 'pending' }, isActive: { $ne: false } };

        const tutor = await User.findOne(tutorQuery)
            .select('_id username email profileImage tutorProfile.fullName tutorProfile.subject tutorProfile.bio tutorProfile.mobileNumber tutorProfile.availability tutorProfile.age tutorProfile.price tutorProfile.priceType tutorProfile.experienceLevel tutorProfile.yearsOfExperience tutorProfile.kyc createdAt')
            .lean();

        if (!tutor) {
            return res.status(404).json({ message: "Tutor not found" });
        }

        const [ratingSummaryMap, reviews, myRatingDoc] = await Promise.all([
            buildRatingSummary([tutor._id]),
            TutorRating.find({ tutor: tutor._id })
                .sort({ createdAt: -1 })
                .limit(20)
                .populate('student', 'username profileImage')
                .lean(),
            TutorRating.findOne({ tutor: tutor._id, student: req.user._id }).lean(),
        ]);

        const ratingSummary = ratingSummaryMap.get(tutor._id.toString()) || emptyRatingSummary;
        const formattedReviews = reviews.map((review) => ({
            id: review._id,
            name: review.student?.username || 'Student',
            profileImage: review.student?.profileImage || '',
            rating: review.rating,
            comment: review.comment || '',
            createdAt: review.createdAt,
            studentId: review.student?._id ? review.student._id.toString() : (review.student ? review.student.toString() : null),
        }));

        res.status(200).json({
            ...tutor,
            ratingSummary,
            reviews: formattedReviews,
            myRating: myRatingDoc?.rating || 0,
        });

    } catch (error) {
        console.error("❌ Error fetching tutor:", error);
        res.status(500).json({ message: "Internal Server error", error: error.message });
    }
});

router.post('/:id/rate', protectRoute, async (req, res) => {
    try {
        const { rating, comment } = req.body || {};
        const normalizedRating = Number(rating);

        if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
            return res.status(400).json({ message: 'Rating must be an integer between 1 and 5' });
        }

        const tutor = await User.findOne({ _id: req.params.id, role: 'tutor', approvalStatus: { $ne: 'pending' }, isActive: { $ne: false } }).select('_id');
        if (!tutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        const normalizedComment = typeof comment === 'string' ? comment.trim() : '';
        if (normalizedComment.length > 300) {
            return res.status(400).json({ message: 'Comment must be 300 characters or less' });
        }

        await TutorRating.findOneAndUpdate(
            { tutor: tutor._id, student: req.user._id },
            {
                tutor: tutor._id,
                student: req.user._id,
                rating: normalizedRating,
                comment: normalizedComment,
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        const ratingSummaryMap = await buildRatingSummary([tutor._id]);

        return res.status(200).json({
            message: 'Rating saved successfully',
            ratingSummary: ratingSummaryMap.get(tutor._id.toString()) || emptyRatingSummary,
            myRating: normalizedRating,
        });
    } catch (error) {
        console.error('❌ Error saving tutor rating:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

export default router;
