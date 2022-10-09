import express from "express";
import mongoose from 'mongoose';
import { User } from "./db/userShema.js";
import path from 'path'
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Task } from "./db/taskSchema.js";
import dotenv from 'dotenv'
dotenv.config();

//getting the root directory path
const __dirname = path.resolve()

const app = express();
//Database connection
const port = process.env.PORT || 3000
mongoose.connect('mongodb://localhost:27017/jwt').then(() => {
    console.log("Database connected successfully");
})

//middleWares
app.use(cookieParser())
app.use(express.urlencoded({
    extended: false
}))
app.use(express.json())
app.use(express.static('public'))
app.set('view engine', 'ejs')

//authentication middleware
const auth = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        jwt.verify(token, process.env.MY_SECRET)
        next()
    } catch (err) {
        console.log(err.message)
        res.redirect("/signin")
    }
}


//Routes Started 
app.get("/", auth, async (req, res) => {
    const { _id } = jwt.verify(req.cookies.jwt, process.env.MY_SECRET)
    const result = await Task.findOne({ uid: _id })
    res.render('index', { result: result?.tasks })
})


app.post('/', auth, async (req, res) => {
    const { _id } = jwt.verify(req.cookies.jwt, process.env.MY_SECRET)
    const task = req.body.task;
    if (task) {
        if (!await Task.findOne({ uid: _id }))
            await Task({
                uid: _id,
                tasks: [{ task: task }]
            }).save()

        else {
            await Task.findOneAndUpdate({ uid: _id }, {
                $push: {
                    tasks: { task }
                }
            })
        }
    }

    res.redirect('/')
})


//route to delete the items
app.post('/delete', auth, async (req, res) => {
    const task = req.query.task;
    const { _id } = jwt.verify(req.cookies.jwt, process.env.MY_SECRET)
    await Task.findOneAndUpdate({ uid: _id }, {
        $pull: {
            tasks: { task }
        }
    })
    res.redirect("/")
})


//route to update the items
app.post("/update", async (req, res) => {
    const task = req.query.task;
    console.log(task)
    const { _id } = jwt.verify(req.cookies.jwt, process.env.MY_SECRET)
    const updatedTask = req.body.updatedTask;
    let taskCollection = await Task.findOne({ uid: _id });
    let taskArray = taskCollection.tasks;
    const index = taskCollection.tasks.findIndex((e) => {
        return e.task == task;
    })
    taskArray[index] = {
        ...taskArray[index],
        task: updatedTask
    }
    await Task.findOneAndUpdate({ uid: _id }, {
        uid: _id,
        tasks: taskArray
    })
    console.log(index);
    console.log(taskCollection.tasks)
    res.redirect('/')
})
app.get("/signin", (req, res) => {
    res.sendFile(__dirname + '/public/signin.html')
})


app.post("/signin", async (req, res) => {
    const { email, password, cpassword } = req.body;
    User.find({ email }, function (err, doc) {
        if (!err) {
            if (doc.length == 0) {
                if (password === cpassword) {
                    const saveuser = async () => {
                        const newUser = User({
                            email,
                            password
                        })

                        try {
                            await newUser.save()
                        } catch (error) {
                            console.error(error.message)
                        }
                    }

                    saveuser()
                    res.redirect('/login')
                }
                else {
                    console.error('invalid credentials')
                    res.redirect('/signin')
                }
            }

            else {
                console.log("email already exists");
                res.redirect('/signin')
            }
        }
        else {
            console.log(err.message)
            res.redirect('/')
        }
    })



})


app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html')
})



app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const doc = await User.findOne({ email })
    if (doc) {
        const islogin = await bcrypt.compare(password, doc.password)
        if (islogin) {
            const token = await doc.generateAuthToken()
            res.cookie('jwt', token, {
                expires: new Date(Date.now() + 2592000000),
                httpOnly: true
            })
            res.redirect("/")
        }
        else {
            res.send("password wrong")
        }
    }
    else {
        console.log("no email found")
        res.status(403).json({
            email: "not found"
        })
    }
})


app.delete("/dummy", (req, res) => {
    console.log("done")

    res.status(200)
})
app.listen(port, () => {
    console.log("Server started at http://localhost:3000")
})