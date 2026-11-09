const reviewService = require("../services/review.service");
const prisma = require("../config/prisma");
const {
    captureReviewProfileFacts,
} = require("../services/user-skin-profile.service");

const { refreshUserProfileEmbedding } = require("../services/user-profile-embedding.service");

async function createReview(req, res) {
    try {
        //users can only write a review after making a purchase
        const userId = req.userId;

        const { productId, rating, reviewText } = req.body;

        const orders = await prisma.order.findMany({
            where: {userId}
        });

        const hasPurchased = orders.some(order => {
            try {
                const items = JSON.parse(order.items);
                return items.some((item) => item.id === Number(productId));
            } catch {
                return false;
            }
        });

        if (!hasPurchased) {
            return res.status(403).json({
                message: "You can only review products you have purchased."
            });
        }

        if(!productId || !rating || !reviewText) {
            return res.status(400).json({
                message: "Product ID, rating, and review text are required."
            });
        }

        if (rating < 1) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5."
            });
        }
        const review = await reviewService.createReview({
            userId, 
            productId: Number(productId),
            rating: Number(rating),
            reviewText,
        });

        if (!review) {
            return res.status(409).json({
                message: "You have already reviewed this product."
            });
        }

        const product = await prisma.product.findUnique({
            where: { id: Number(productId) },
            select: { id: true, name: true, brand: true, category: true },
        });
        const capturedProfile = await captureReviewProfileFacts(userId, reviewText, product);
        if (capturedProfile.facts.length > 0 || capturedProfile.skinType) {
            await refreshUserProfileEmbedding(userId);
        }

        return res.status(201).json(review);

    } catch(error) {
        console.error("createReview error: ", error);
        return res.status(500).json({
            message: "Could not create review"
        });
    }
}

async function getReviewsByProductId(req, res) {
    try {
        const productId = Number(req.params.productId);

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const reviews = await reviewService.getReviewsByProductId(productId);
        return res.status(200).json(reviews);
    } catch (error) {
        console.error("getReviewsByProductId error: ", error);
        return res.status(500).json({
            message: "Failed to fetch reviews"
        });
    }
}

async function getReviewsByUserId(req, res) {
    try {
        const userId = req.userId;

        const reviews = await reviewService.getReviewsByUserId(userId);
        return res.status(200).json(reviews);
    } catch (error) {
        console.error("getReviewsByUserId error: ", error);
        return res.status(500).json({
            message: "Could not load reviews"
        });
    }
}

async function getRatingByProductId(req, res) {
    try {
        const productId = Number(req.params.productId);

        if (Number.isNaN(productId)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const result = await reviewService.getRatingByProductId(productId);
        return res.status(200).json(result);
    } catch(error) {
        console.error("getRatingByProductId error: ", error);
        return res.status(500).json({
            message: "Could not load rating"
        });
    }
}

async function deleteReview(req, res) {
    try {
        const userId = req.userId;
        const reviewId = Number(req.params.reviewId);

        if (Number.isNaN(reviewId)) {
            return res.status(400).json({
                message: "Invalid review ID"
            });
        }

        const result = await reviewService.deleteReview(reviewId, userId);

        if (result === "unauthorized action") {
            return res.status(403).json({
                message: "You are not authorized to delete this review."
            });
        }
        return res.status(200).json({
            message: "Review deleted"
        });
    } catch (error) {
        console.error("deleteReview error: ", error);
        return res.status(500).json({
            message: "Could not delete review"
        });
    }
}

module.exports = {
    createReview,
    getReviewsByProductId,
    getReviewsByUserId,
    getRatingByProductId,
    deleteReview,
};
