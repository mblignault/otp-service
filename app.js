const express = require('express')
// const res = require('express/lib/response')

require('./mongodb.js')

const app = express()

app.use(express.json())

app.get('/', (request, result) => {
    result.send('OTP Service Active')
})

const PORT = process.env.port || 8080

app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`)
})