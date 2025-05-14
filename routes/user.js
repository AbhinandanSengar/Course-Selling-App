const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { JWT_USER_PASSWORD } = require("../config");

const { Router } = require("express");
const { userModel, courseModel, purchaseModel } = require("../db");
const { userMiddleware } = require("../middleware/user");
const userRouter = Router();

//Signup Route
userRouter.post("/signup", async function(req, res) {
    const signUpSchema = z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string()
            .email({ message: "Invalid email format" }),
        password: z.string()
            .min(8, { message: "Minimum 8 characters" })
            .max(32, { message: "Maximum 32 characters" })
    });

    const parsedData = signUpSchema.safeParse(req.body);
    if(!parsedData.success) {
        return res.status(400).send({
            message: "Invalid format",
            error: parsedData.error
        });
    }

    const { firstName, lastName, email, password } = parsedData.data;

    try {
        const existingUser = await userModel.findOne({ email });
        if(existingUser) {
            return res.status(400).send({
                message: "User already exists"
            });
        }

        const hashPassword = await bcrypt.hash(password, 10);
        
        const user = await userModel.create({
            firstName,
            lastName,
            email,
            password: hashPassword
        });

        res.status(201).send({
            message: "Signed up successfully"
        });
    } catch(error) {
        console.error("Signup error: ", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

//Signin Route
userRouter.post("/signin", async function(req, res) {
    const signInSchema = z.object({
        email: z.string()
            .email({ message: "Invalid email format" }),
        password: z.string()
            .min(8, { message: "Minimum 8 characters" })
            .max(32, { message: "Maximum 32 characters" })
    });

    const parsedData = signInSchema.safeParse(req.body);
    if(!parsedData.success) {
        res.status(400).send({
            message: "Invalid format",
            error: parsedData.error
        });
    }

    const { email, password } = parsedData.data;

    try {
        const user = await userModel.findOne({ email });
        if(!user) {
            return res.status(400).send({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if(!passwordMatch) {
            return res.status(400).send({
                message: "Invalid password"
            });
        }

        const token = jwt.sign({ id: user._id.toString() }, JWT_USER_PASSWORD, { expiresIn: "1h" });

        res.status(201).send({
            message: "Signed in successfully",
            token: token
        });
    } catch(error) {
        console.error("Signin error: ", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

//Purchased Course Display Route
userRouter.get("/purchases", userMiddleware, async function(req, res) {
    const userId = req.userId;

    try {
        const userPurchases = await purchaseModel.find({ userId });

        if(userPurchases.length === 0) {
            return res.status(404).send({
                message: "No purchased courses found"
            });
        }

        const courseIds = userPurchases.map(purchase => purchase.courseId);

        const courseDetails = await courseModel.find({
            _id: { $in: courseIds}
        });

        res.status(200).send({
            message: "Courses displayed successfully",
            courses: courseDetails
        });
    } catch(error) {
        console.error("Course display error: ", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

module.exports = {
    userRouter: userRouter
}