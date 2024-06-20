const db = require("../models");
const User = db.users;
const Company = db.companies;
const bcrypt = require("bcryptjs");

//get all alumnis
exports.getAlumni = async (req, res) => {
    try {
        // Paginação
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);

        // Validação de página e limite
        if (isNaN(page) || page < 0) {
            return res.status(400).json({
                success: false,
                message: "Page must be 0 or a positive integer"
            });
        }
        if (isNaN(limit) || limit <= 5) {
            return res.status(400).json({
                success: false,
                message: "Limit must be a positive integer, greater than 5"
            });
        }

        // Construção de objeto para pesquisa
        const query = { type: "alumni" };
        if (req.query.name) {
            query.name = { $regex: req.query.name, $options: "i" }; // Pesquisa de nome (case-insensitive)
        }
        if (req.query.company) {
            query.companys = { $elemMatch: { name: { $regex: req.query.company, $options: "i" } } }; // Pesquisa de empresa (case-insensitive)
        }
        if (req.query.location) {
            query.location = { $regex: req.query.location, $options: "i" }; // Pesquisa de localização (case-insensitive)
        }
        if (req.query.courseEndDate) {
            query.courseEndDate = req.query.courseEndDate; // Pesquisa por data de término do curso
        }
        if (req.query.activityField) {
            query.activityField = { $regex: req.query.activityField, $options: "i" }; // Pesquisa de campo de atividade (case-insensitive)
        }

        // Contagem total de alumni com filtro
        const totalAlumni = await User.countDocuments(query);

        // Encontrar alumni com limite e deslocamento
        const alumni = await User.find(query)
            .skip(page * limit)
            .limit(limit)
            .select('-password') // Excluir a senha dos resultados
            .exec();

        // Construção do objeto das páginas
        const pagination = {
            total: totalAlumni,
            pages: Math.ceil(totalAlumni / limit),
            current: page + 1,
            limit: limit
        };

        // Construção da resposta
        const responseData = {
            pagination: pagination,
            data: alumni.map(alumni => ({
                id: alumni.id,
                type: alumni.type,
                name: alumni.name,
                email: alumni.email,
                companys: alumni.companys,
                location: alumni.location,
                courseEndDate: alumni.courseEndDate,
                activityField: alumni.activityField,
                points: alumni.points,
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

//update alumni
exports.updateAlumniById = async (req, res) => {
    const userId = req.params.id;
    const { password, confirmPassword, location, activityField} = req.body;

    if(userId !== req.loggedUserId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        const alumni = await User.findById(userId);
        if(!alumni) {
            return res.status(404).json({message: "Alumni not found"});
        }

        if (password && confirmPassword) {
            if (password === confirmPassword) {
              if (bcrypt.compareSync(password, alumni.password)) {
                return res
                  .status(400)
                  .json({ message: "The old password cannot be the same." });
              } else {
                alumni.password = bcrypt.hashSync(password, 10);
              }
            } else {
              return res.status(400).json({ message: "As passwords do not match" });
            }
        } else if (password && !confirmPassword) {
            return res.status(400).json({ message: "Confirm password!" });
          } else if (!password && confirmPassword) {
            return res.status(400).json({ message: "Insert the password!" });
            }
        
        if(location) {
            alumni.location = location;
        }

        if(activityField) {
            alumni.activityField = activityField;
        }

        await alumni.save();
        res.status(200).json({
            success: true,
            message: "Alumni updated successfully"
        });
    } catch(err) {
        res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
            });
    }
};

//delete alumni by id as own alumni or admin
exports.deleteAlumni = async (req, res) => {
    const userId = req.params.id;
    
    // Verifica se o utilizador é um admin
    if (req.loggedUserType === "admin") {
        try {
            const alumni = await User.findByIdAndDelete(req.params.id);
            await Company.updateMany(
                { "associates.idUser": userId },
                { $pull: { "associates": { idUser: userId } } }
              );
            if (!alumni)
                return res.status(404).json({
                    success: false,
                    message: "Alumni not found"
                });
            return res.status(200).json({
                success: true,
                message: "Alumni deleted successfully"
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: err.message || "Something went wrong. Please try again later"
            });
        }
    }

    if (userId !== req.loggedUserId) {
        return res.status(401).json({ message: res.error || "Unauthorized" });
    }

    try {
        const alumni = await User.findByIdAndDelete(req.params.id);
        //quando removido, é removido das companys
        await Company.updateMany(
            { "associates.idUser": userId },
            { $pull: { "associates": { idUser: userId } } }
          );
        if (!alumni)
            return res.status(404).json({
                success: false,
                message: "Alumni not found"
            });

        return res.status(200).json({
            success: true,
            message: "Alumni deleted successfully"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message || "Something went wrong. Please try again later"
        });
    }
};

exports.addCompanyToAlumni = async (req, res) => {
    const userId = req.params.id;
    const { companyId, name, location, position, startDate, endDate } = req.body;

    if (userId !== req.loggedUserId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        // Verificar se o alumni existe
        const alumni = await User.findById(userId);
        if (!alumni || alumni.type !== "alumni") {
            return res.status(404).json({ message: "Alumni not found" });
        }

        // Verificar se o alumni já tem uma empresa associada
        if (alumni.companys && alumni.companys.length > 0) {
            return res.status(400).json({ message: "Alumni already has a company associated. You can't add another one using this route." });
        }

        let company;
        if (companyId) {
            // Verificar se a empresa existe e está verificada
            company = await Company.findById(companyId);
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }
            if (!company.verified) {
                return res.status(400).json({ message: "Company is not verified" });
            }
        } else if (name) {
            // Criar uma nova empresa com verificação pendente
            company = new Company({
                name: name,
                location: location,
                verified: false,
                associates: []
            });
            await company.save();
        } else {
            return res.status(400).json({ message: "Company ID or name is required" });
        }

        // Adicionar a empresa ao perfil do alumni
        alumni.companys.push({
            idCompany: company.id,
            name: company.name,
            position: position,
            startDate: startDate,
            endDate: endDate
        });

        // Adicionar o alumni aos associados da empresa
        company.associates.push({
            idUser: userId
        });

        // Salvar as alterações no perfil do alumni e na empresa
        await alumni.save();
        await company.save();

        res.status(201).json({ message: "Company added to alumni profile successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Something went wrong. Please try again later" });
    }
};

exports.changeCompanyAlumni = async (req, res) => {
    const userId = req.params.id;
    const { newCompanyId, position, startDate } = req.body;

    if (userId !== req.loggedUserId) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    try {
        // Verificar se o alumni existe
        const alumni = await User.findById(userId);
        if (!alumni || alumni.type !== "alumni") {
            return res.status(404).json({ message: "Alumni not found" });
        }

        // Verificar se há uma empresa atual
        const currentCompany = alumni.companys.find(company => company.endDate === null);
        if (!currentCompany) {
            return res.status(400).json({ message: "No current company found" });
        }

        // Atualizar a data de término da empresa atual
        currentCompany.endDate = new Date();

        // Remover o alumni dos associados da empresa atual
        await Company.updateOne(
            { _id: currentCompany.idCompany },
            { $pull: { associates: { idUser: userId } } }
        );

        // Verificar se a nova empresa existe e está verificada
        let newCompany = await Company.findById(newCompanyId);
        if (!newCompany) {
            return res.status(404).json({ message: "New company not found" });
        }
        if (!newCompany.verified) {
            return res.status(400).json({ message: "New company is not verified" });
        }

        // Adicionar a nova empresa ao perfil do alumni
        alumni.companys.push({
            idCompany: newCompanyId,
            name: newCompany.name,
            position: position,
            startDate: startDate,
            endDate: null
        });

        // Adicionar o alumni aos associados da nova empresa
        newCompany.associates.push({
            idUser: userId,
        });

        // Salvar as alterações no perfil do alumni e na nova empresa
        await alumni.save();
        await newCompany.save();

        res.status(200).json({ message: "Company changed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Something went wrong. Please try again later" });
    }
};
