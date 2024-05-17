const db = require("../models");
const User = db.users;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/db.config.js");

exports.create = async (req, res) => {
    const user = new User({
        type: req.body.type,
        name: req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10),
        confirmPassword: req.body.confirmPassword,
        location: req.body.location,
        courseEndDate: req.body.courseEndDate,
        activityField: req.body.activityField
    });

    if(req.body.type !== "alumni" && req.body.type !== "admin") {
        res.status(400).json({
            sucess: false,
            message: "The userType is admin or alumni"
        })
    }

    if(!req.body.confirmPassword) {
        res.status(400).json({
            success: false,
            message: "Confirm password is required"
        });
        return;
    }

    if(req.body.password !== req.body.confirmPassword) {
        res.status(400).json({
            success: false,
            message: "Password and confirm password do not match"
        });
        return;
    }

    const currentYear = new Date().getFullYear();

    if(req.body.courseEndDate >= currentYear) {
        res.status(400).json({
            success: false,
            message: "Course end date cannot be in the future"
        });
        return;
    }

    //verificar se já existe o email
    const emailExists = await User.findOne({email: req.body.email})
    if(emailExists) {
        res.status(400).json({
            success: false,
            message: "Email already exists"
        });
        return;
    }

    try {
        await user.save();
        res.status(201).json({
            success: true,
            message: "User created successfully"
        });
    } catch (err) {
        if (err.name === "ValidationError") {
            let errors = {};
            Object.keys(err.errors).forEach((key) => {
                errors[key] = err.errors[key].message;
            });
            //Verificar se o nome de utilizador foi fornecido
            if(!req.body.name) {
                errors["name"] = "Indique o nome de utilizador";
            }

            //verificar se a password foi fornecida
            if(!req.body.password) {
                errors["password"] = "Indique uma password";
            }

            //verificar se o email foi fornecido
            if(!req.body.email) {
                errors["email"] = "Indique um email";
            }   
            
            res.status(400).json({
                success: false,
                message: ("Validation error", errors),
            });
        } else {
            res.status(500).json({
                success: false,
                message: err.message || "something went wrong, try later.",
            });
        }
    }    
};

//rota para fazer login
exports.login = async (req, res) => {
    try {
        if(!req.body || !req.body.email || !req.body.password)
            return res.status(400).json({
                success: false,
                message: "You must indicate the email and the password",
            });
        
        const user = await User.findOne({
            email: req.body.email,
        }).exec();

        if(!user)
            return res.status(404).json({
                success: false,
                message: "User not found",
            });

        const passwordIsValid = bcrypt.compareSync(
            req.body.password,
            user.password
        );
        if(!passwordIsValid)
            return res.status(401).json({
            success: false,
            acessToken: null,
            message: "Invalid password",
        });

        const token = jwt.sign(
            {
                id: user._id,
                type: user.type,
            },
            config.SECRET,
            {
                expiresIn: "24h",
            }
        );
        return res.status(200).json({
            success: true,
            acessToken: token,
            message: "login successfully",
        });
    } catch (err) {
        if(err.name === "ValidationError") {
            let errors = {};
            Object.keys(err.errors).forEach((key) => {
                errors[key] = err.errors[key].message;
            });
            res.status(400).json({
                sucess: false,
                message: errors,
            });
        } else {
            res.status(500).json({
                success: false,
                message: err.message || "Something went wrong, try later. Internal server error",
            });
        }
    }
};