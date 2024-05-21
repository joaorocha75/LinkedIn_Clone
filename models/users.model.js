module.exports = (mongoose) => {
    const schema = mongoose.Schema(
        {
            type: {type: String, default: "guest" },
            name: {type: String, required: true },
            email: {type: String, required: true, unique: true },
            password: {type: String, required: true },
            location: {type: String, required: true},
            courseEndDate: {type: Number, required: true},
            activityField: {type: String, required: true},
            points: {type: Number, required: true, default:0},
            companys: [
                {
                    idCompany: {type: mongoose.Schema.Types.ObjectId, ref: 'Company'},
                    name: {type: String, required: true},
                    position: {type: String},
                    startDate: {type: Date},
                    endDate: {type: Date},
                }
            ]
        },
        { timestamps: false }
    );
    const User = mongoose.model('User', schema);
    return User;
}