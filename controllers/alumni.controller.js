const db = require("../models");
const User = db.users;

//Get alumni by Id
exports.getAlumniById = async (req, res) => {
    try {
        let alumni = await User.findById(req.params.id).select("-password");
        if (!alumni) {
            return res.status(404).json({
                success: false,
                message: "Alumni not found"
            });
        }
        res.status(200).json({
            success: true,
            alumni: alumni,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};