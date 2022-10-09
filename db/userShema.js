import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    tokens: [
        {
            token: {
                type: String,
                required: true
            }
        }
    ]
})

userSchema.methods.generateAuthToken = async function () {
    try {
        const token = jwt.sign({ _id: this._id }, process.env.MY_SECRET)
        this.tokens = this.tokens.concat({ token: token })
        await this.save();
        return token
    } catch (error) {
        console.log(error.message);
    }
}


userSchema.pre('save', async function (next) {

    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 12)
    }
    next();

})

export const User = new mongoose.model('users', userSchema)