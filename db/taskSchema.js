import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true
    },
    tasks: [{
        task: {
            type: String,
            required: true
        }
    }]
})

export const Task = new mongoose.model('task', taskSchema)