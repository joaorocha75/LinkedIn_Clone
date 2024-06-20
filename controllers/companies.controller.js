const db = require("../models");
const User = db.users;
const Company = db.companies;

//create a company as admin
exports.createCompany = async (req, res) => {
    const company = new Company({
        name: req.body.name,
        location: req.body.location,
        verified: true,
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

exports.getCompanies = async (req, res) => {
    try {
        // Paginação
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 10;

        // Validação de página e limite
        if (isNaN(page) || page < 0) {
            return res.status(400).json({
                success: false,
                message: "Page must be 0 or a positive integer"
            });
        }
        if (isNaN(limit) || limit !== 10) {
            return res.status(400).json({
                success: false,
                message: "Limit must be exactly 10"
            });
        }

        // Contagem total de empresas
        const totalCompanies = await Company.countDocuments();

        // Encontrar empresas com limite e deslocamento
        const companies = await Company.find()
            .skip(page * limit)
            .limit(limit)
            .exec();

        // Construir objeto de resposta
        const pagination = {
            total: totalCompanies,
            pages: Math.ceil(totalCompanies / limit),
            current: page + 1,
            limit: limit
        };

        // Construir resposta
        const responseData = {
            pagination: pagination,
            data: companies.map(company => ({
                id: company.id,
                name: company.name,
                location: company.location,
                verified: company.verified,
                associates: company.associates,
            }))
        };

        // Enviar resposta
        res.status(200).json(responseData);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.getCompanyById = async (req, res) => {
    try {
        let company = await Company.findById(req.params.id)
        if(!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }
        res.status(200).json({
            success: true,
            company: company,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.updateCompany = async (req, res) => {
    const companyId = req.params.id;
    const {name, location} = req.body;

    if(req.loggedUserType !== "admin") {
        return res.status(401).json({
            success: false,
            message: "You are not authorized to perform this action"
        });
    }

    try {
        const company = await Company.findById(companyId);
        if(!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }
        
        if (name) {
            company.name = name;
            await User.updateMany(
                {"companys.idCompany": companyId},
                {"$set": {"companys.$.name": name}}
            )
        }

        if(location) {
            company.location = location;
            await User.updateMany(
                { "companys.idCompany": companyId }, 
                { "$set": { "companys.$.location": location } }
            );
        }

        await company.save();
        res.status(200).json({
            success: true,
            message: "Company updated successfully"
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.verifyCompany = async (req, res) => {
    const companyId = req.params.id;

    // Verifica se o utilizador é um admin
    if (req.loggedUserType !== "admin") {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        company.verified = true; // Marca a empresa como verificada

        await company.save();

        res.status(200).json({
            success: true,
            message: "Company verified successfully",
            company
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.removeAlumniFromCompany = async (req, res) => {
    const companyId = req.params.id;
    const alumniId = req.params.alumniId;

    if (req.loggedUserType !== "admin") {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        // Verificar se a empresa existe
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Remover o alumni do array de associados da empresa
        company.associates = company.associates.filter(associate => associate.idUser.toString() !== alumniId);
        await company.save();

        // Remover a empresa do perfil do alumni
        const alumni = await User.findById(alumniId);
        if (alumni) {
            alumni.companys = alumni.companys.filter(company => company.idCompany.toString() !== companyId);
            await alumni.save();
        }

        res.status(200).json({
            success: true,
            message: "Alumni removed from company successfully and company removed from alumni profile"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Something went wrong. Please try again later"
        });
    }
};

