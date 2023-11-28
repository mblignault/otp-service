// TODO: Is this needed?
module.exports = (mongoose) => {
    const Users = mongoose.model(
        "users",
        mongoose.Schema({
            email: { type: String, required: true },
        })
    );
    return Users;
};
