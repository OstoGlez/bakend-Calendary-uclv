const express = require("express")
//📚Database
const mongoose = require("./database")
//Parsers
const bodyParser = require("body-parser")
//CORS
const cors = require("cors")
//🔐Auth with JWT
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
//Exceljs
const ExcelJS = require("exceljs")
const path = require("path")
//Enviroment
require("dotenv").config()
//Schemas
const Sketch = require("./schemas/sketch")
const User = require("./schemas/user")
const Proposition = require("./schemas/proposition")

//JWT functions
async function validateToken(token) {
    let res = false
    jwt.verify(token, process.env.SECRET, (err, result) => {
        if (err)
            res = false
        else
            res = true
    })
    return res
}
function generateToken(user) {
    try {
        return jwt.sign(user, process.env.SECRET, { expiresIn: "1d" })
    }
    catch (error) {
        console.log(error)
    }
}

function decodeToken(token) {
    try {
        return jwt.decode(token)
    }
    catch (error) {
        return false
        console.log(error)
    }
}


//Server
const app = express()

//⚙️Server settings
const PORT = 7000

//Middlewares
app.use(cors())
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: false }))

//⭐API
app.set("port", process.env.PORT || PORT)
//Protection middleware wich checks if token is from authenticated user
async function protectionMiddlware(req, res, next) {
    try {
        if (req.headers.authorization) {
            let token = req.headers.authorization.replace("Bearer ", "")
            if (validateToken(token)) {
                const user = decodeToken(token)
                if (user) {
                    const foundUser = await User.find({ name: user.name })
                    if (foundUser.length == 0)
                        res.status(401).send({ error: true })
                    else {
                        if (foundUser[0].password == user.password)
                            next()
                        else {
                            res.status(401).send({ error: true })
                        }
                    }
                }
                else {
                    res.status(401).send({ error: true })
                }
            }
            else {
                res.status(401).send({ error: true })
            }
        }
        else {
            res.status(401).send({ error: true })
        }
    }
    catch (e) {
        res.status(401).send({ error: true })
    }
}
//Check range of user by the token
function checkRange(token, range) {
    try {
        let user = decodeToken(token.replace("Bearer ", ""))
        if (range.filter(e => e == user.range).length > 0)
            return true
        else
            return false
    }
    catch (e) {
        return false
    }
}

//Endpoints
app.get("/", (req, res) => {
    res.send("Working!")
})

app.post("/create", protectionMiddlware, async (req, res) => {
    const { title, weeks, career, year, type, legend, subjects, initDate, endingDate, rooms } = req.body
    console.log(req.body)
    let newSketch = new Sketch(req.body)
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            let saved = await newSketch.save()
            res.json({ error: false })
        }
        else {
            res.send({ error: true, message: "No autorizado" })
            console.log("No autorizado a crear sketch")
        }
    }
    catch (error) {
        console.log(error)
        res.send({ error: true, message: "Error en los datos enviados!" })
    }
})

app.get("/sketcheslist", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer", "professor"])) {
            const sketches = await Sketch.find({})
            res.send(sketches)
        }
        else
            res.send({ error: true, message: "No autorizado!" })
    }
    catch (error) {
        console.log(error)
        res.send({ error: true })
    }
})
app.get("/getsketch/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer", "professor"])) {
            const sketches = await Sketch.find({ _id: req.params._id })
            res.send(sketches)
        }
        else
            res.send({ error: true, message: "No autorizado!" })
    }
    catch (error) {
        //console.log(error)
        res.send({ error: true })
    }
})
app.get("/sketcheslistpublished", async (req, res) => {
    try {
        let sketches = await Sketch.find({})
        sketches = sketches.filter(e => e.published)
        res.send(sketches)
    }
    catch (error) {
        console.log(error)
        res.send({ error: true })
    }
})
app.post("/deletesketch/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            const deletedSketch = await Sketch.findOneAndDelete({ _id: req.params._id })
            res.json({ error: false })
        }
        else
            console.error("No autorizado");
    } catch (error) {
        console.error('Error al eliminar el libro:', error);
        res.json({ error: true })
    }
})
app.post("/publishhide/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            const findSketch = await Sketch.findOne({ _id: req.params._id })
            const sketchFound = await Sketch.findOneAndUpdate(
                { _id: req.params._id },
                {
                    published: !findSketch.published
                }
            )
            res.json({ error: false })
        }
        else
            res.json({ error: true, message: "No autorizado" })
    }
    catch (error) {
        console.log(error)
        res.json({ error: true, message: error })
    }
})
app.post("/changesketch/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            let sketches = await Sketch.findOneAndUpdate(
                { _id: req.params._id },
                { ...req.body }
            )
            res.json({ error: false })
        }
        else
            res.json({ error: true, message: "No autorizado" })
    }
    catch (error) {
        console.log(error)
        res.json({ error: true })
    }
})
app.get("/verify/:token", async (req, res) => {
    if (validateToken(req.params.token)) {
        const user = decodeToken(req.params.token)
        if (user) {
            const foundUser = await User.find({ name: user.name })
            if (foundUser.length == 0)
                res.json({ error: true })
            else {
                if (foundUser[0].password == user.password)
                    res.json({ error: false })
                else
                    res.json({ error: true })
            }
        }
        else {
            res.json({ error: true })
        }
    }
    else {
        res.json({ error: true })
    }
})
app.get("/verifyrange/:token/:ranges", async (req, res) => {
    if (validateToken(req.params.token)) {
        const user = decodeToken(req.params.token)
        let foundUser = null
        if (user)
            foundUser = await User.find({ name: user.name })
        else
            foundUser = []
        if (foundUser.length == 0)
            res.json({ error: true })
        else {
            try {
                const ranges = JSON.parse(req.params.ranges)
                if (foundUser[0].password == user.password && ranges.filter(e => e == user.range).length > 0)
                    res.json({ error: false })
                else
                    res.json({ error: true })
            }
            catch (error) {
                console.log(error)
            }
        }
    }
    else {
        res.json({ error: true })
    }
})
app.post("/auth", async (req, res) => {
    const foundUser = await User.find({ name: req.body.name })
    if (foundUser.length == 0)
        res.json({ error: true, id: 1 })
    else {
        try {
            const match = await bcrypt.compare(req.body.password, foundUser[0].password)
            if (match)
                res.json({ error: false, token: generateToken({ name: foundUser[0].name, range: foundUser[0].range, password: foundUser[0].password }) })
            else
                res.json({ error: true, id: 2 })
        }
        catch (error) {
            console.log(error)
        }
    }
})
app.get("/unreadpropositions", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            const foundPropositions = await Proposition.find({ readed: false })
            res.json({ error: false, propositions: foundPropositions })
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (error) {
        console.log(error)
        res.json({ error: true })
    }

})
app.get("/getallpropositions", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            const foundPropositions = await Proposition.find({})
            res.json({ error: false, propositions: foundPropositions })
        }
        else
            res.json({ error: true, message: "No autorizado!" })

    }
    catch (error) {
        console.log(error)
        res.json({ error: true })
    }

})
app.get("/deleteproposition/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            const deletedProposition = await Proposition.findOneAndDelete({ _id: req.params._id })
            res.json({ error: false })
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (error) {
        res.json({ error: true })
    }
})
app.get("/readedproposition/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            let foundProposition = await Proposition.find({ _id: req.params._id })
            if (foundProposition.length > 0) {
                foundProposition = foundProposition[0]
                const newPropositionState = await Proposition.findOneAndUpdate({ _id: req.params._id }, { readed: foundProposition.readed ? false : true })
                res.json({ error: false })
            }
            else {
                res.json({ error: true })
            }
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (error) {
        res.json({ error: true })
        console.log(error)
    }
})
app.get("/getusername/:token", protectionMiddlware, async (req, res) => {
    if (checkRange(req.headers.authorization, ["admin", "programmer", "professor"])) {
        if (validateToken(req.params.token)) {
            const user = decodeToken(req.params.token)
            if (user) {
                const foundUser = await User.find({ name: user.name })
                if (foundUser.length == 0)
                    res.json({ error: true })
                else {
                    if (foundUser[0].password == user.password) {
                        res.json({ error: false, name: foundUser[0].name })
                    }
                    else
                        res.json({ error: true })
                }
            }
            else {
                res.json({ error: true })
            }
        }
        else {
            res.json({ error: true })
        }
    }
    else
        res.json({ error: true, message: "No autorizado!" })
})
app.get("/getrange/:token", protectionMiddlware, async (req, res) => {
    if (checkRange(req.headers.authorization, ["admin", "programmer", "professor"])) {
        if (validateToken(req.params.token)) {
            const user = decodeToken(req.params.token)
            if (user) {
                const foundUser = await User.find({ name: user.name })
                if (foundUser.length == 0)
                    res.json({ error: true })
                else {
                    if (foundUser[0].password == user.password) {
                        res.json({ error: false, range: foundUser[0].range })
                    }
                    else
                        res.json({ error: true })
                }
            }
            else {
                res.json({ error: true })
            }
        }
        else {
            res.json({ error: true })
        }
    }
    else
        res.json({ error: true, message: "No autorizado!" })
})
app.post("/createproposition", protectionMiddlware, async (req, res) => {
    try {
        const newProposition = new Proposition(req.body)
        const saved = await newProposition.save()
        res.json({ error: false })
    }
    catch (error) {
        res.json({ error: true })
        console.log(error)
    }
})
function sortInRows(sketch) {
    const groupsSize = 6
    const rowsPerWeek = 9
    const weeks = sketch.length / 9

    let sketchCopy = [...sketch]
    let newSketch = []
    let row = []
    const weeksArray = []
    //Separate groups of weeks
    for (let week = 0; week < weeks; week += groupsSize) {
        sketchCopy = [...sketch]
        let slice = sketchCopy.splice(week * 9, groupsSize * 9)
        weeksArray.push(slice)
    }
    //Sort groups of weeks 
    weeksArray.map(weekGroup => {
        let row = []
        const length = weekGroup.length / 9
        for (let i = 0; i < 9; i++) {
            for (let x = 0; x < length; x++) {
                row = [...row, weekGroup[i + x * 9]]
            }
            newSketch.push(row)
            row = []
        }
    })
    const sortedSketch = []
    for (let i = 0; i < newSketch.length; i++) {
        newSketch[i].splice(groupsSize * 7)
        const row = []
        newSketch[i].map(e => row.push(...e))
        sortedSketch.push(row)
    }
    return sortedSketch
}
function setEmptyCol(array, intervalo) {
    const resultado = [];

    for (let i = 0; i < array.length; i++) {
        resultado.push(array[i]);

        if ((i + 1) % intervalo === 0) {
            resultado.push(" ");
        }
    }

    return resultado;
}
function setTurnOfCol(array, intervalo) {
    console.log()
    const resultado = []
    let rest = 0
    for (let i = 0; i < array.length; i++) {
        if (array[i][0] == "" || array[i][0] == "L" || array[i][0] == " ") {
            rest++
            resultado[i] = ["", ...array[i]]
        }
        else if (i % intervalo != 0 && (i - 5) % 6 != 0) {
            resultado[i] = [i % intervalo - 1, ...array[i]]
        }
        else if (array[i][0] != " " && array[i][0] != "") {
            resultado[i] = [i % intervalo - 1, ...array[i]]
        }
        else {
            resultado[i] = ["", ...array[i]]
        }
    }
    return resultado;
}
app.get("/exporttoexcel/:_id/:filter", protectionMiddlware, async (req, res) => {
    console.log("Test!")
    try {
        console.log("Getting request")
        //Authentication according to range
        if (checkRange(req.headers.authorization, ["admin", "programmer", "professor"])) {
            //Check if the sketch exists for exporting
            let sketch = await Sketch.find({ _id: req.params._id })
            if (sketch.length > 0) {
                //Creating workbook
                const workbook = new ExcelJS.Workbook();
                //Setting properties of workbook
                workbook.creator = 'UCLV Sketches';
                workbook.lastModifiedBy = 'UCLV Sketches';
                workbook.created = new Date();
                workbook.modified = new Date();
                workbook.lastPrinted = new Date();
                workbook.calcProperties.fullCalcOnLoad = true;
                //Creating sheet
                const sheet = workbook.addWorksheet("Horario")
                //Setting properties of sheet
                sheet.visible = "visible"

                sketch = sketch[0]
                //Sort if filter exists
                if (req.params.filter != undefined && req.params.filter != null && req.params.filter != "none") {
                    for (let i = 0; i < sketch.subjects.length; i++) {
                        for (let x = 0; x < sketch.subjects[i].length; x++) {
                            for (let y = 0; y < sketch.subjects[i][x].length; y++) {
                                if (!sketch.subjects[i][x][y].includes(req.params.filter)) {
                                    sketch.subjects[i][x][y] = "-"
                                }
                            }
                        }
                    }
                }

                //Adding info rows to the excel
                sheet.addRow(["Carrera: " + sketch.career])
                sheet.addRow(["Año: " + sketch.year + "                          Ministerio de Educación Superior"])
                sheet.addRow(["Grupo: " + sketch.group])
                //Sorting subjects
                const rowsToExport = []
                sketch.subjects.map((week, i) => {
                    let newArray = []

                    for (let y = 0; y < 7; y++) {
                        if (y == 3)
                            newArray.push([" ", " ", " ", " ", " ", " ", " "])
                        newArray.push([])
                        for (let x = 0; x < 7; x++) {
                            if (y >= 3)
                                newArray[y + 1][x] = week[x][y]
                            else
                                newArray[y][x] = week[x][y]
                        }
                    }
                    newArray = [["L", "M", "M", "J", "V", "S", "D"], ...newArray]
                    newArray = [["", "", "Semana " + (i + 1), "", "", "", ""], ...newArray]
                    for (let i = 0; i < 9; i++) {
                        rowsToExport.push(newArray[i])
                    }

                })

                //Sort in pure rows in groups of N weeks
                let rows = sortInRows(rowsToExport)
                //Set style for cells
                const row = sheet.getRow(1)
                for (let col = "A"; col < sketch.weeks; col = obtenerSiguienteValor(col)) {
                    for (let row = 1; row < rows.length; row++) {
                        const cell = sheet.getCell(`${col}${row}`)
                        cell.border = {
                            top: { style: "medium" },
                            left: { style: "medium" },
                            bottom: { style: "medium" },
                            right: { style: "medium" },
                        }
                    }
                }
                rows = rows.map(e => setEmptyCol(e, 7))
                rows = setTurnOfCol(rows, 9)
                //Width of columns
                for (let i = 1; i < sketch.weeks * 9 + 1; i++) {
                    const col = sheet.getColumn(i)
                    col.width = 3
                }
                //Add each row
                rows.map(e => sheet.addRow(e))
                //Estilos
                let rowGot = sheet.getRow(4)
                rowGot.height = 13
                for (let i = 0; i < rows.length; i++) {
                    if ((i + 1) % 9 != 0) {
                        const row = sheet.getRow(i + 5)
                        if (rows[i + 1][0] == " ")
                            row.height = 5
                        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
                            cell.alignment = { horizontal: "center" }
                            if (rows[i + 1][colNumber - 1] != " " && rows[i + 1][colNumber - 1] != "L" && rows[i + 1][colNumber - 1] != "M" && rows[i + 1][colNumber - 1] != "M" && rows[i + 1][colNumber - 1] != "J" && rows[i + 1][colNumber - 1] != "V" && rows[i + 1][colNumber - 1] != "S" && rows[i + 1][colNumber - 1] != "D") {
                                //Up left corner
                                if (((i - 1) % 9 == 0 && (colNumber - 2) % 8 == 0) || ((i - 5) % 9 == 0 && (colNumber - 2) % 8 == 0))
                                    cell.border = {
                                        top: { style: 'medium' }, // Estilo del borde superior
                                        left: { style: 'medium' }, // Estilo del borde izquierdo
                                        bottom: { style: 'thin' }, // Estilo del borde inferior
                                    };
                                //Bottom left corner
                                else if (((i - 3) % 9 == 0 && (colNumber - 2) % 8 == 0) || ((i - 7) % 9 == 0 && (colNumber - 2) % 8 == 0)) {
                                    cell.border = {
                                        top: { style: 'thin' }, // Estilo del borde superior
                                        left: { style: 'medium' }, // Estilo del borde izquierdo
                                        bottom: { style: 'medium' }, // Estilo del borde inferior
                                    };
                                }
                                //Right bottom corner
                                else if (((i - 3) % 9 == 0 && (colNumber - 8) % 8 == 0) || ((i - 7) % 9 == 0 && (colNumber - 8) % 8 == 0)) {
                                    cell.border = {
                                        bottom: { style: 'medium' }, // Estilo del borde inferior
                                        right: { style: 'medium' } // Estilo del borde derecho
                                    };
                                }
                                //Right up corner
                                else if ((((i - 1) % 9 == 0 && (colNumber - 8) % 8 == 0) || ((i - 5) % 9 == 0 && (colNumber - 8) % 8 == 0))) {
                                    cell.border = {
                                        top: { style: "medium" },
                                        bottom: { style: 'thin' }, // Estilo del borde inferior
                                        right: { style: 'medium' }, // Estilo del borde derecho
                                        left: { style: 'thin' } // Estilo del borde derecho
                                    };
                                }
                                //Up
                                else if ((((i - 1) % 9 == 0 && (colNumber - 2) % 8 != 0) || ((i - 5) % 9 == 0 && (colNumber - 2) % 8 != 0)) && colNumber != 1)
                                    cell.border = {
                                        top: { style: 'medium' }, // Estilo del borde superior
                                        left: { style: 'thin' }, // Estilo del borde izquierdo
                                        bottom: { style: 'thin' }, // Estilo del borde inferior
                                    };
                                //Bottom
                                else if ((((i - 3) % 9 == 0 && (colNumber - 2) % 8 != 0) || ((i - 7) % 9 == 0 && (colNumber - 2) % 8 != 0)) && colNumber != 1) {
                                    cell.border = {
                                        left: { style: 'thin' }, // Estilo del borde izquierdo
                                        bottom: { style: 'medium' }, // Estilo del borde inferior
                                        right: { style: 'thin' } // Estilo del borde derecho
                                    };
                                }
                                //Left
                                else if ((colNumber - 2) % 8 == 0)
                                    cell.border = {
                                        top: { style: 'thin' }, // Estilo del borde superior
                                        left: { style: 'medium' }, // Estilo del borde izquierdo
                                        bottom: { style: 'thin' }, // Estilo del borde inferior
                                    };
                                //Right
                                else if ((colNumber - 8) % 8 == 0)
                                    cell.border = {
                                        right: { style: 'medium' }, // Estilo del borde superior
                                        left: { style: 'thin' }, // Estilo del borde superior
                                        bottom: { style: 'thin' }, // Estilo del borde superior
                                    };
                                else if (colNumber != 1)
                                    cell.border = {
                                        left: { style: 'thin' }, // Estilo del borde superior
                                        bottom: { style: 'thin' }, // Estilo del borde superior
                                    };
                                else {
                                    cell.style = {
                                        font: { italic: true, underline: true }
                                    }
                                    cell.alignment = { horizontal: "center", vertical: "middle" }
                                }
                                const column = sheet.getColumn(colNumber)
                                column.width = 2.7
                            }
                            else {
                                cell.style = {
                                    font: { italic: false }
                                }
                                cell.alignment = { horizontal: "center", vertical: "middle" }
                                const column = sheet.getColumn(colNumber)
                                column.width = 2
                            }
                        });
                    }
                    else {
                        const row = sheet.getRow(i + 5)
                        row.height = 13
                    }
                }

                //Writing legend
                const legend = [...sketch.legend]
                const legendTags = [...sketch.legendTags]

                const legendRows = []
                const legendTagsRows = []

                let actualRow = 1
                const identifiersPerRow = 4
                let cols = Math.ceil(legend.length / identifiersPerRow)
                console.log(cols)
                //Add margin to headers
                legendRows[0] = [null]
                legendTagsRows[0] = [null]
                //Add headers
                for (let i = 0; i < cols; i++) {
                    legendRows[0] = [...legendRows[0], "Símbolo", null, null, null, "Asignatura", null, null, null, null]
                    legendTagsRows[0] = [...legendTagsRows[0], "Símbolo", null, null, null, "Significado", null, null, null, null]
                }

                //Sort legend
                for (let i = 0; i < legend.length; i++) {
                    if (i % identifiersPerRow == 0) {
                        actualRow = 1
                    }
                    else {
                        actualRow++
                    }
                    if (legendRows[actualRow] == undefined)
                        legendRows[actualRow] = [null]
                    legendRows[actualRow] = [...legendRows[actualRow], legend[i].from, null, null, null, legend[i].to, null, null, null, null]
                }
                actualRow = 1
                for (let i = 0; i < legendTags.length; i++) {
                    if (i % identifiersPerRow == 0) {
                        actualRow = 1
                    }
                    else {
                        actualRow++
                    }
                    if (legendTagsRows[actualRow] == undefined)
                        legendTagsRows[actualRow] = [null]
                    legendTagsRows[actualRow] = [...legendTagsRows[actualRow], legendTags[i].from, null, null, null, legendTags[i].to, null, null, null, null]
                }
                //Fill legend empty spaces
                let fillLegend = legendRows[1].length
                for (let i = 0; i < legendRows.length; i++) {
                    for (let x = 0; x < fillLegend; x++) {
                        if (legendRows[i][x] == undefined)
                            legendRows[i][x] = null
                    }
                }
                //Merge both legends rows
                const mergeRows = []
                const lengthRows = legendTagsRows.length > legendRows.length ? legendTagsRows.length : legendRows.length
                for (let i = 0; i < lengthRows; i++) {
                    if (legendRows[i] != undefined && legendTagsRows[i] != undefined) {
                        mergeRows[i] = [...legendRows[i], ...legendTagsRows[i]]
                    }
                    else if (legendRows[i] != undefined) {
                        mergeRows[i] = [...legendRows[i]]
                    }
                    else {
                        mergeRows[i] = [...legendTagsRows[i]]
                    }
                }
                //Add legend to sheet
                for (let i = 0; i < mergeRows.length; i++) {
                    sheet.addRow(mergeRows[i])
                }
                //Writting file
                await workbook.xlsx.writeFile('uclv_sketch.xlsx')
                const filePath = path.join(__dirname, '/uclv_sketch.xlsx');
                //Downloading file
                res.download(filePath, 'export.xlsx', (error) => {
                    if (error) {
                        console.log('Error al descargar el archivo:', error);
                    } else {
                        console.log('Archivo descargado correctamente.');
                    }
                    // Aumentar el tiempo de espera para la descarga
                    setTimeout(() => {
                        res.end();
                    }, 5000); // Espera 5 segundos antes de cerrar la conexión [Muy importante]
                });
            }
            else {
                res.status(500).json({ error: true })
            }
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (error) {
        console.log(error)
        res.json({ error: true })
    }
})
app.get("/clonsketch/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            let foundSketch = await Sketch.find({ _id: req.params._id })
            if (foundSketch.length > 0) {
                foundSketch = foundSketch[0]
                foundSketch = { ...foundSketch }
                foundSketch = foundSketch._doc
                delete foundSketch._id
                foundSketch.title += "[COPIA]"
                const newSketch = new Sketch({ ...foundSketch })
                const save = await newSketch.save()
                res.json({ error: false })
            }
            else {
                res.json({ error: true })
            }
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (error) {
        console.log(error)
        res.json({ error: true })
    }
})
app.post("/updatesketch/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin", "programmer"])) {
            let foundSketch = await Sketch.find({ _id: req.params._id })
            if (foundSketch.length > 0) {
                foundSketch = foundSketch[0]
                const newSketchState = await Sketch.findOneAndUpdate({ _id: req.params._id }, { ...req.body })
                res.json({ error: false })
            }
            else {
                res.json({ error: true, message: "No hay ningun horario así" })
            }
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (error) {
        res.json({ error: true, message: error })
        console.log(error)
    }
})
app.post("/createuser", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin"])) {
            const saltRounds = 10

            let data = { ...req.body }
            data.password = await bcrypt.hash(req.body.password, saltRounds);

            let user = new User(data)
            const savedUser = await user.save()
            res.json({ error: false })
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (e) {
        console.log(e)
        res.json({ error: true })
    }
})
app.post("/updateuser", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin"])) {

            let data = { ...req.body }
            let updatedUser = { name: data.name, range: data.range }
            console.log(data)
            let user = await User.findOneAndUpdate({ name: data.originalname }, updatedUser)
            res.json({ error: false })
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (e) {
        console.log(e)
        res.json({ error: true })
    }
})
app.get("/getusers", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin"])) {
            const users = await User.find({})
            const newUsers = users.map(user => { return new Object({ name: user.name, _id: user._id, range: user.range }) })
            res.json({ error: false, users: newUsers })
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (e) {
        res.json({ error: true })
    }
})
app.get("/removeuser/:_id", protectionMiddlware, async (req, res) => {
    try {
        if (checkRange(req.headers.authorization, ["admin"])) {
            const user = await User.findOneAndRemove({ _id: req.params._id })
            res.json({ error: false })
        }
        else
            res.json({ error: true, message: "No autorizado!" })
    }
    catch (e) {
        console.log(e)
        res.json({ error: true })
    }
})
//🌟Running server
async function createDefaultUser() {
    try {
        const defaultUsers = await User.find({ name: "Starship", range: "admin" })
        if (defaultUsers.length == 0) {
            let password = process.env.DEFAULTPASS
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            let user = new User({
                name: "Starship",
                password: hashedPassword,
                range: "admin"
            })
            let saved = await user.save()
        }
    }
    catch (e) {
        console.error(e)
    }
}
async function createProposition() {
    const proposition = new Proposition({
        by: "Gilberto",
        title: "Cambiar horario 1",
        description: "Hay que cambiar la semana 1 entera desde el martes."
    })
    await proposition.save()
}
async function createAdminUser() {
    const saltRounds = 10

    let data = {name:"Admin",range:"admin"}
    data.password = await bcrypt.hash("mySecure#", saltRounds);

    let user = new User(data)
    const savedUser = await user.save()
}
app.listen(app.get("port"), () => {
    //createAdminUser()
    //createProposition()
    createDefaultUser()
    console.log("Servidor inicializado en el puerto " + app.get("port") + "!")
})