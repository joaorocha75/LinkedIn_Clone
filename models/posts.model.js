module.exports = (mongoose) => {
    const schema = new mongoose.Schema(
        {
            idUser: {type:mongoose.Schema.Types.ObjectId, ref: 'User'},
            message: {type:String, required: true},
            date: {type:Date, required: true},
            expiresAt: {type:Date, required: true, index: { expires: '0s' }},
            likes: {type: Number, default:0},
            comments: [
                {
                    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
                    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
                    comment: {type: String, required: true},
                    date: {type: Date, required: true},
                }
            ]
        },
        {timestamps: false}
    );
    const Posts =  mongoose.model('Posts', schema);
    return Posts;
}