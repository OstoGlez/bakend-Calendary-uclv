const mongoose = require("mongoose")

const sketchSchema = new mongoose.Schema({
    defaultRoom: {
        type: String,
        required: true
    },
    weeks: {
        type: Number,
        required: true
    },
    career: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    type: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
        unique: true
    },
    legend: [{
        from: {
            type: String,
            required: true,
            unique: false
        },
        to: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: false,
            default: ""
        },
        hours:{
            type:Number,
            required:true,
            default:0
        }
    }],
    legendTags: [{
        from: {
            type: String,
            required: true,
            unique: false
        },
        to: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: false,
            default: ""
        }
    }],
    tagsNumber: {
        type: Number,
        required: true
    },
    subjects: [
        {
            type: [[String]],
            required: true
        }
    ],
    rooms: [
        {
            type: [[String]],
            required: true
        }
    ],
    blockedSubjects: [
        {
            type: [[Boolean]],
            required: true,
            default: false
        }
    ],
    blockedWeeks: [
        {
            type: Number,
            required: true,
            default: false
        }
    ],
    group: {
        type: Number,
        required: true
    },
    published: {
        type: Boolean,
        required: true
    },
    subjectsNumber: {
        type: Number,
        required: true
    },
    initDate: {
        type: Date,
        required: true
    },
    endingDate: {
        type: Date,
        required: true
    }
})

module.exports = mongoose.model("Sketch", sketchSchema)