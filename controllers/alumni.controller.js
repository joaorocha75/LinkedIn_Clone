const db = require("../models");
const User = db.users;
const Company = db.companies;

//get all alumnis
exports.getAlumni = async (req, res) => {
    try {
        // Paginação
        const page = parseInt(req.query.page) || 0; // Página atual
        const limit = parseInt(req.query.limit) || 10; // Número de documentos por página

        //Construção de objeto para pesquisa
        const query = { type: "alumni" };
        if (req.query.name) {
            query.name = { $regex: req.query.name, $options: "i" }; // Pesquisa de nome (case-insensitive)
        }
        if (req.query.company) {
            query.company = { $regex: req.query.company, $options: "i" }; // Pesquisa de empresa (case-insensitive)
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

        // Contagem total de alumni
        const totalAlumni = await User.countDocuments({ type: "Alumni" });

        // Encontrar alumni com limite e deslocamento
        // Para as querys nao funcionarem, volta a forma inicial || const alumni = await User.find({ type: "Alumni" })
        const alumni = await User.find(query)
                                   .skip(page * limit)
                                   .limit(limit)
                                   .select('-password') // Excluir a senha dos resultados
                                   .exec();

        // Construção do objeto das páginas
        const pagination = {
            total: totalAlumni,
            pages: Math.ceil(totalAlumni / limit),
            current: page,
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

// adicionar uma empresa a um alumni
exports.addCompanyToAlumni = async (req, res) => {
    const userId = req.params.id;
    const { companyId, position, startDate, endDate } = req.body;

    if(userId !== req.loggedUserId) {
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

        // Verificar se a empresa existe
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }

        // Adicionar a empresa ao perfil do alumni
        alumni.companys.push({
            idCompany: companyId,
            name: company.name,
            position: position,
            startDate: startDate,
            endDate: endDate
        });

        // Adicionar o alumni aos associados da empresa
        company.associates.push({
            idUser: userId,
        });

        // Salvar as alterações no perfil do alumni e na empresa
        await alumni.save();
        await company.save();

        res.status(201).json({ message: "Company added to alumni profile successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message || "Something went wrong. Please try again later" });
    }
};

