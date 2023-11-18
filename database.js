const mongoose = require("mongoose")
const uri = "mongodb+srv://backend:LCVt9zy1YJemXGWW@cluster0.t4r1vls.mongodb.net/?retryWrites=true&w=majority";
const oldUri = "mongodb://127.0.0.1:27017/uclv-database"

mongoose.connect(uri)
    .then(() => {
        console.log("Conexión exitosa de la base de datos!")
    })
    .catch((error) => {
        console.log("Error al conectar la base de datos!", error)
    })

module.exports = mongoose