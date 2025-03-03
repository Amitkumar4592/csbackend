const express = require("express");
const router = express.Router();
const admin = require("firebase-admin");
const db = admin.firestore();

// 📌 Create a Blog Post
router.post("/create", async (req, res) => {
    try {
        const { userId, title, content } = req.body;

        if (!userId || !title || !content) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newPost = {
            userId,
            title,
            content,
            createdAt: admin.firestore.Timestamp.now(),
            likes: 0,
            comments: []
        };

        const postRef = await db.collection("posts").add(newPost);
        return res.status(201).json({ message: "Post created successfully", postId: postRef.id });

    } catch (error) {
        console.error("Error creating post:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// 📌 Like a Post
// 📌 Like/Unlike a Post
router.post("/like", async (req, res) => {
    try {
        const { userId, postId } = req.body;

        if (!userId || !postId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const postRef = db.collection("posts").doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ message: "Post not found" });
        }

        const likeRef = db.collection("likes").doc(`${userId}_${postId}`);
        const likeDoc = await likeRef.get();

        if (likeDoc.exists) {
            // If already liked, remove the like (unlike)
            await likeRef.delete();
            return res.status(200).json({ message: "Like removed successfully" });
        } else {
            // If not liked, add the like
            await likeRef.set({
                userId,
                postId,
                createdAt: admin.firestore.Timestamp.now()
            });
            return res.status(201).json({ message: "Post liked successfully" });
        }
    } catch (error) {
        console.error("Error liking/unliking post:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


// 📌 Comment on a Post
router.post("/comment", async (req, res) => {
    try {
        const { userId, postId, comment } = req.body;

        if (!userId || !postId || !comment) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const postRef = db.collection("posts").doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Add comment to Firestore
        const commentRef = db.collection("comments").doc();
        await commentRef.set({
            id: commentRef.id,
            postId,
            userId,
            comment,
            createdAt: admin.firestore.Timestamp.now()
        });

        return res.status(201).json({
            message: "Comment added successfully",
            commentId: commentRef.id
        });

    } catch (error) {
        console.error("Error adding comment:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// 📌 Delete a Post
router.delete("/delete/:postId", async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.body;

        if (!postId || !userId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const postRef = db.collection("posts").doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ message: "Post not found" });
        }

        const postData = postDoc.data();

        if (postData.userId !== userId) {
            return res.status(403).json({ message: "Unauthorized: You can only delete your own posts" });
        }

        // Delete the post
        await postRef.delete();
        return res.status(200).json({ message: "Post deleted successfully" });

    } catch (error) {
        console.error("Error deleting post:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// 📌 Fetch a Single Post by ID
router.get("/:postId", async (req, res) => {
    try {
        const { postId } = req.params;

        if (!postId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const postRef = db.collection("posts").doc(postId);
        const postDoc = await postRef.get();

        if (!postDoc.exists) {
            return res.status(404).json({ message: "Post not found" });
        }

        let postData = postDoc.data();

        // Fetch likes count
        const likesSnapshot = await db.collection("likes")
            .where("postId", "==", postId)
            .get();
        const likesCount = likesSnapshot.size;

        // Fetch comments
        const commentsSnapshot = await db.collection("comments")
            .where("postId", "==", postId)
            .orderBy("timestamp", "desc")
            .get();

        let comments = commentsSnapshot.docs.map(doc => doc.data());

        return res.status(200).json({
            postId,
            ...postData,
            likesCount,
            comments
        });

    } catch (error) {
        console.error("Error fetching post:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get('/user/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        //console.log(`🔍 Fetching posts for user: ${userId}`);

        // Query Firestore with ordering
        const postsRef = db.collection('posts')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc'); // Requires an index

        const snapshot = await postsRef.get();

        //console.log(`📌 Total posts found: ${snapshot.size}`);

        if (snapshot.empty) {
          //  console.log("⚠️ No posts found for this user.");
            return res.status(404).json({ message: "No posts found for this user." });
        }

        let posts = [];
        snapshot.forEach(doc => {
           // console.log(`✅ Post Found: ${JSON.stringify(doc.data())}`);
            posts.push({ id: doc.id, ...doc.data() });
        });

        return res.json(posts);
    } catch (error) {
        if (error.code === 9) {  // Firestore Index Error
            console.error("❌ Firestore Index Missing. Create it in Firebase Console.");
            return res.status(500).json({ 
                error: "Firestore index required. Please create an index for userId & timestamp." 
            });
        }

        console.error("🔥 Error fetching user's posts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/comments/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        console.log(`🔍 Fetching comments for post: ${postId}`);

        // Query comments where `postId` matches, ordered by `createdAt`
        const commentsRef = db.collection('comments')
            .where('postId', '==', postId)
            .orderBy('createdAt', 'asc'); // Oldest comments first

        const snapshot = await commentsRef.get();

        console.log(`📌 Total comments found: ${snapshot.size}`);

        if (snapshot.empty) {
            console.log("⚠️ No comments found for this post.");
            return res.status(404).json({ message: "No comments found for this post." });
        }

        let comments = [];
        snapshot.forEach(doc => {
            console.log(`💬 Comment Found: ${JSON.stringify(doc.data())}`);
            comments.push({ id: doc.id, ...doc.data() });
        });

        return res.json(comments);
    } catch (error) {
        if (error.code === 9) {  // Firestore Index Error
            console.error("❌ Firestore Index Missing. Create it in Firebase Console.");
            return res.status(500).json({ 
                error: "Firestore index required. Please create an index for postId & createdAt." 
            });
        }

        console.error("🔥 Error fetching comments:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.post('/user/follow/:targetUserId', async (req, res) => {
    try {
        const { followerId } = req.body;  // Take followerId from the request body
        const followingId = req.params.targetUserId;

        if (!followerId) {
            return res.status(400).json({ message: "Follower ID is required." });
        }

        if (followerId === followingId) {
            return res.status(400).json({ message: "You cannot follow yourself." });
        }

        console.log(`🔍 Checking follow status: ${followerId} → ${followingId}`);

        const followRef = db.collection('followers')
            .where('followerId', '==', followerId)
            .where('followingId', '==', followingId);
        
        const snapshot = await followRef.get();

        if (!snapshot.empty) {
            // User is already following → Unfollow
            snapshot.forEach(async (doc) => {
                await db.collection('followers').doc(doc.id).delete();
            });

            console.log(`🚀 Unfollowed: ${followerId} → ${followingId}`);
            return res.json({ message: "User unfollowed successfully." });
        } else {
            // User is not following → Follow
            await db.collection('followers').add({
                followerId,
                followingId,
                createdAt: new Date()
            });

            console.log(`✅ Followed: ${followerId} → ${followingId}`);
            return res.json({ message: "User followed successfully." });
        }
    } catch (error) {
        console.error("🔥 Error in follow/unfollow:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/user/followers/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`Fetching followers for user: ${userId}`);

        const followersRef = db.collection('followers')
            .where('followingId', '==', userId);

        const snapshot = await followersRef.get();

        console.log(`Total followers found: ${snapshot.size}`);

        if (snapshot.empty) {
            return res.status(404).json({ message: "No followers found for this user." });
        }

        let followers = [];
        snapshot.forEach(doc => {
            console.log(`Follower Found: ${JSON.stringify(doc.data())}`);
            followers.push(doc.data().followerId);
        });

        return res.json({ followers });
    } catch (error) {
        console.error("🔥 Error fetching followers:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/user/following/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        console.log(`Fetching users followed by: ${userId}`);

        const followingRef = db.collection('followers')
            .where('followerId', '==', userId);

        const snapshot = await followingRef.get();

        console.log(`Total following found: ${snapshot.size}`);

        if (snapshot.empty) {
            return res.status(404).json({ message: "User is not following anyone." });
        }

        let following = [];
        snapshot.forEach(doc => {
            console.log(`Following Found: ${JSON.stringify(doc.data())}`);
            following.push(doc.data().followingId);
        });

        return res.json({ following });
    } catch (error) {
        console.error("🔥 Error fetching following list:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/feed', async (req, res) => {
    console.log("🔥 /feed API hit");

    try {
        const userId = req.query.userId;
        if (!userId) {
            console.log("❌ No User ID provided.");
            return res.status(400).json({ error: "User ID is required" });
        }

        console.log(`✅ Fetching feed for user: ${userId}`);

        // Step 1: Get followed users
        const followingSnapshot = await db.collection('followers')
            .where('followerId', '==', userId)
            .get();

        let followingUserIds = [];
        followingSnapshot.forEach(doc => {
            followingUserIds.push(doc.data().followingId);
        });

        console.log(`🔹 User follows these IDs: ${JSON.stringify(followingUserIds)}`);

        let allPosts = [];

        // Step 2: Fetch posts from followed users (if any)
        if (followingUserIds.length > 0) {
            const followedPostsSnapshot = await db.collection('posts')
                .where('userId', 'in', followingUserIds)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            console.log(`📌 Followed Users' Posts Count: ${followedPostsSnapshot.size}`);

            followedPostsSnapshot.forEach(doc => {
                allPosts.push({ id: doc.id, ...doc.data(), priority: true });
            });
        }

        // Step 3: Fetch global posts if needed
        if (allPosts.length < 10) { // Fill remaining feed slots
            const globalPostsSnapshot = await db.collection('posts')
                .orderBy('createdAt', 'desc')
                .limit(10 - allPosts.length)
                .get();

            console.log(`🌍 Global Posts Count: ${globalPostsSnapshot.size}`);

            globalPostsSnapshot.forEach(doc => {
                allPosts.push({ id: doc.id, ...doc.data(), priority: false });
            });
        }

        // Step 4: Ensure unique posts (avoid duplicates)
        let seenPostIds = new Set();
        let uniqueFeed = allPosts.filter(post => {
            if (seenPostIds.has(post.id)) return false;
            seenPostIds.add(post.id);
            return true;
        });

        console.log(`✅ Final Feed Count: ${uniqueFeed.length}`);

        // Step 5: Return feed
        if (uniqueFeed.length === 0) {
            return res.json({ message: "No posts available. Start following users!" });
        }

        return res.json({ feed: uniqueFeed });

    } catch (error) {
        console.error("🔥 Error fetching feed:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get('/test', (req, res) => {
    console.log("✅ Test route hit!");
    res.json({ message: "Server is working!" });
});

module.exports = router;
