module.exports = (mongoose) => {
    const schema = mongoose.Schema(
        {
            name: {type: String, required: true, unique: true},
            location: {type: String, required: true},
            associates: [
                {
                    idUser: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
                }
            ]
        },
        {timestamps: false}
    );
    const Company = mongoose.model('Company', schema);
    return Company;
}