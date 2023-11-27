const mongoose = require('mongoose')

const DB_URI = 'mongodb://my_test:my_test@127.0.0.1:27017/my_test?authSource=admin'

mongoose.connect(DB_URI, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true
}).then(() => console.log("MongodDB Connected")).catch((err)=> console.log("MongoDB Connection Error", { err }))