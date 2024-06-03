const express = require("express");
let router = express.Router();
const companiesController = require("../controllers/companies.controller");
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
    .post(authController.verifyToken, companiesController.createCompany)
    .get(companiesController.getCompanies);

router
    .route("/:id")
    .get(companiesController.getCompanyById)
    .patch(authController.verifyToken, companiesController.updateCompany);

router
    .route("/:id/verify")
    .put(authController.verifyToken, companiesController.verifyCompany);

router
    .route("/:id/associates/:alumniId")
    .delete(authController.verifyToken, companiesController.removeAlumniFromCompany);



router.all("*", function (req, res) {
    res.status(404).json({ message: "Companies: what???" });
});

// EXPORT ROUTES (required by APP)
module.exports = router;