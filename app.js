import express from "express";
import mongoose from 'mongoose';
import { User } from "./db/userShema.js";
import path from 'path'
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { Task } from "./db/taskSchema.js";
import dotenv from 'dotenv'
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUI from 'swagger-ui-express'
dotenv.config();


//getting the root directory path
const __dirname = path.resolve()
const app = express();

const DB = 'mongodb+srv://ankit:ankit501@cluster0.0wt3ijf.mongodb.net/?retryWrites=true&w=majority'
//Database connection
const port = process.env.PORT || 3000
// 'mongodb://localhost:27017/jwt'
mongoose.connect(DB).then(() => {
    console.log("Database connected successfully");
}).catch((err) => {
    console.log(err.message);
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


//Swagger options
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'Api',
            version: '1.0.0'
        }
    },
    apis: ['app.js']
}

const swaggerDocs = swaggerJsDoc(swaggerOptions)

app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs))

//Routes Started 

/**
 * @swagger
 * /:
 *  get:
 *   description: Get all the tasks
 *   responses:
 *    200:
 *     description: success
 */


app.get("/", auth, async (req, res) => {
    const { _id } = jwt.verify(req.cookies.jwt, process.env.MY_SECRET)
    const result = await Task.findOne({ uid: _id })
    res.render('index', { result: result?.tasks })
})

/**
 * @swagger
 * /:
 *  post:
 *   description: Add task
 *   parameters:
 *   - name: task
 *     description: Add task to the DB
 *     in: formData
 *     required: true
 *     type: string
 *   responses:
 *    201:
 *     description: created
 */

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
/**
 * @swagger
 * /delete:
 *  post:
 *   description: Delete the task
 *   parameters:
 *   - name: task
 *     description: Delete task from the DB
 *     in: formData
 *     required: true
 *     type: string
 *   responses:
 *    200:
 *     description: success 
 */
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

/**
 * @swagger
 * /Update:
 *  post:
 *   description: Update Task
 *   parameters:
 *   - name: task
 *     description: task to be replaced
 *     in: formData
 *     required: true
 *     type: string
 *   - name: updatedTask
 *     description: updated task
 *     in: formData
 *     required: true
 *     type: string
 *   responses:
 *    201:
 *     description: created
 */
app.post("/update", async (req, res) => {
    const task = req.query.task;
    console.log(task)
    const { _id } = jwt.verify(req.cookies.jwt, process.env.MY_SECRET)
    const updatedTask = req.body.updatedTask;
    if (updatedTask) {
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
    }

})

/**
 * @swagger
 * /singin:
 *  get:
 *   description: dispalays the signin page
 *   responses:
 *    200:
 *     description: success
 */
app.get("/signin", (req, res) => {
    res.sendFile(__dirname + '/public/signin.html')
})

/**
 * @swagger
 * /signin:
 *  post:
 *   description: Signin route
 *   parameters:
 *   - name: email
 *     description: email
 *     in: formData
 *     required: true
 *     type: string
 *   - name: password
 *     description: password
 *     in: formData
 *     required: true
 *     type: string
 *   - name: cpassword
 *     description: comfirm password
 *     in: formData
 *     required: true
 *     type: string
 *   responses:
 *    200:
 *     description: success
 */
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

/**
 * @swagger
 * /login:
 *  get:
 *   description: displays the login page
 *   responses:
 *    200:
 *     description: success
 */
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html')
})


/**
 * @swagger
 * /login:
 *  post:
 *   description: login route
 *   parameters:
 *   - name: email
 *     description: email
 *     in: formData
 *     required: true
 *     type: string
 *   - name: password
 *     description: password
 *     in: formData
 *     required: true
 *     type: string
 *   responses:
 *    200:
 *     description: success
 */
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



app.listen(port, () => {
    console.log("Server started at http://localhost:3000")
})