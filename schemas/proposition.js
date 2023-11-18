const mongoose = require("mongoose")

const propositionSchema = new mongoose.Schema({
    by: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    readed: {
        type: Boolean,
        required: false,
        default: false
    },
    cell: {
        type: { turn: { type: Number, required: true }, day: { type: Number, required: true }, week: { type: Number, required: true }, id: { type: String, required: true } },
        required: true
    }
})
module.exports = mongoose.model("proposition", propositionSchema)