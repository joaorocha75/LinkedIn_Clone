const express = require("express");
let router = express.Router();
const userController = require("../controllers/users.controller");
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
  .route("/register")
  .post(userController.create)

router
  .route("/login")
  .post(userController.login)

router.all("*", function (req, res) {
    res.status(404).json({ message: "Users: what???" });
});

// EXPORT ROUTES (required by APP)
module.exports = router;
