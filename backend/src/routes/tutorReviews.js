

import express from 'express';
import TutorRating from '../models/TutorRating.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();

// Update a review (only by the student who created it)
router.patch('/review/:reviewId', protectRoute, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { comment, rating } = req.body || {};
        const review = await TutorRating.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        if (String(review.student) !== String(req.user._id)) {
            return res.status(403).json({ message: 'You can only update your own review' });
        }
        if (comment !== undefined) review.comment = comment;
        if (rating !== undefined) review.rating = rating;
        await review.save();
        return res.status(200).json({ message: 'Review updated', review });
    } catch (error) {
        console.error('❌ Error updating review:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

// Delete a review (only by the student who created it)
router.delete('/review/:reviewId', protectRoute, async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = await TutorRating.findById(reviewId);
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        if (String(review.student) !== String(req.user._id)) {
            return res.status(403).json({ message: 'You can only delete your own review' });
        }
        await review.deleteOne();
        return res.status(200).json({ message: 'Review deleted' });
    } catch (error) {
        console.error('❌ Error deleting review:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});


// Get reviews for a tutor (with optional limit)
router.get('/:id/reviews', async (req, res) => {
    try {
        const tutorId = req.params.id;
        let limit = parseInt(req.query.limit);
        if (isNaN(limit) || limit < 1) limit = undefined;
        let reviewsQuery = TutorRating.find({ tutor: tutorId })
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
            studentId: review.student?._id ? review.student._id.toString() : (review.student ? review.student.toString() : null),
        }));
        return res.status(200).json({ reviews: formattedReviews });
    } catch (error) {
        console.error('❌ Error fetching tutor reviews:', error);
        return res.status(500).json({ message: 'Internal Server error', error: error.message });
    }
});

export default router;