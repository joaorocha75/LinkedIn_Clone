const db = require("../models");
const User = db.users;
const Company = db.companies;

//create a company as admin
exports.createCompany = async (req, res) => {
    const company = new Company({
        name: req.body.name,
        location: req.body.location,
    });

    if(req.loggedUserType !== "admin") {
        res.status(400).json({
            sucess: false,
            message: "Only admin can create a company."
        })
    }

    //verificar se a empresa já existe
    const companyExists = await Company.findOne({ name: req.body.name });
    if (companyExists) {
        res.status(400).json({
            sucess: false,
            message: "That company already exists"
        });
        return;
    }

    try {
        await company.save();
        res.status(201).json({
            sucess: true,
            message: "Company created successfully"
        });
    } catch (err) {
        res.status(500).json({
            sucess: false,
            message: err.message || "something went wrong, try later.",
        });
    }
};