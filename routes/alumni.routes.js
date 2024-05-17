const express = require("express");
let router = express.Router();
const alumniController = require("../controllers/alumni.controller");
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

// Definir a rota para /alumni/:id antes da rota curinga
router.route("/:id").get(alumniController.getAlumniById);

// Definir a rota curinga apenas depois de todas as outras rotas
router.all("*", function (req, res) {
    res.status(404).json({ message: "Alumni: what???" });
});

// EXPORT ROUTES (required by APP)
module.exports = router;
