const express = require("express");
let router = express.Router();
const postsController = require("../controllers/posts.controller");
const authController = require("../controllers/auth.controller");

// middleware for all routes related with users
router.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      // finish event is emitted once the response is sent to the client
      const diffSeconds = (Date.now() - start) / 1000; // figure out how many seconds elapsed
      console.log(
        `${req.method} ${req.originalUrl} completed in ${diffSeconds} seconds`
      );
    });
    next();
});

router
    .route("/")
    .post(authController.verifyToken, postsController.createPost)
    .get(postsController.getPosts);

router
    .route("/:id")
    .get(postsController.getPostById)
    .delete(authController.verifyToken, postsController.deletePostById);

router
    .route("/:id/comments")
    .post(authController.verifyToken, postsController.commentPost);

router
    .route("/:id/comments/:commentId")
    .delete(authController.verifyToken, postsController.deleteComment);

router
    .route("/:id/like")
    .post(authController.verifyToken, postsController.likePost);

router
    .route("/:id/dislike")
    .post(authController.verifyToken, postsController.dislikePost);


router.all("*", function (req, res) {
    res.status(404).json({ message: "Posts: what???" });
});

module.exports = router;