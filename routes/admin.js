const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { JWT_ADMIN_PASSWORD } = require("../config");

const { Router } = require("express");

const adminRouter = Router();
const { adminModel, courseModel } = require("../db");
const { adminMiddleware } = require("../middleware/admin");

//Signup Route
adminRouter.post("/signup", async function(req, res) {
    const signUpSchema = z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string()
            .email({ message: "Invalid email address" }),
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
        const existingUser = await adminModel.findOne({ email });
        if(existingUser) {
            return res.status(400).send({
                message: "User already exists"
            });
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const admin = await adminModel.create({
            firstName,
            lastName,
            email,
            password: hashPassword
        });

        res.status(201).send({
            message: "Signup successfully"
        });
    } catch(error) {
        console.error("Signup error:", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

//Signin Route
adminRouter.post("/signin", async function(req, res) {
    const signInSchema = z.object({
        email: z.string()
            .email({ message: "Invalid email format" }),
        password: z.string()
            .min(8, { message: "Minimum 8 characters" })
            .max(32, { message: "Maximum 32 characters" })
    });

    const parsedData = signInSchema.safeParse(req.body);

    if(!parsedData.success) {
        return res.status(400).send({
            message: "Invalid format",
            error: parsedData.error
        });
    }

    const { email, password } = parsedData.data;

    try {
        const admin = await adminModel.findOne({ email });
        if(!admin) {
            return res.status(400).send({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if(!passwordMatch) {
            return res.status(400).send({
                message: "Invalid password"
            });
        }

        const token = jwt.sign({ id: admin._id.toString() }, JWT_ADMIN_PASSWORD, { expiresIn: "1h" });

        res.status(201).send({
            message: "Signed In successfully",
            token: token
        });
    } catch(error) {
        console.error("Signin error:", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        })
    }
});

//Course Creation Route
adminRouter.post("/course", adminMiddleware, async function(req, res) {
    const courseSchema = z.object({
        title: z.string(),
        description: z.string()
            .max(500, { message: "Maximum 500 characters"}),
        price: z.preprocess(val => Number(val), z.number().positive()),
        imageUrl: z.string()
            .url({ message: "Invalid image url" })
    });

    const parsedData = courseSchema.safeParse(req.body);
    if(!parsedData.success) {
        return res.status(400).send({
            message: "Invalid format",
            error: parsedData.error
        });
    }
    const adminId = req.adminId;

    const { title, description, price, imageUrl } = parsedData.data;

    try {
        const newCourse = await courseModel.create({
            title,
            description,
            price,
            imageUrl,
            creatorId: adminId
        });
    
        res.status(201).send({
            message: "Course created successfully!",
            course: newCourse
        });
    } catch(error) {
        console.error("Course creation error: ", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

//Course Updation route
adminRouter.put("/course/:courseId", adminMiddleware, async function(req, res) {
    const courseId = req.params.courseId;
    const adminId = req.adminId;

    const updatedCourseSchema = z.object({
        title: z.string().optional(),
        description: z.string().max(500, { message: "Maximum 500 characters"}).optional(),
        price: z.preprocess(val => Number(val), z.number().positive()).optional(),
        imageUrl: z.string().url({ message: "Invalid image url" }).optional()
    });

    const parsedData = updatedCourseSchema.safeParse(req.body);
    if(!parsedData) {
        return res.status(400).send({
            message: "Invalid format",
            error: parsedData.error
        });
    }

    try {
        const existingCourse = await courseModel.findById(courseId);
        if(!existingCourse) {
            return res.status(404).send({
                message: "Course not found"
            });
        }

        if(existingCourse.creatorId.toString() !== adminId) {
            return res.status(403).send({
                message: "Unauthorized"
            });
        }

        Object.assign(existingCourse, parsedData.data);
        await existingCourse.save();

        res.status(201).send({
            message: "Course updated succesfully",
            course: existingCourse
        });
    } catch(error) {
        console.error("Course Updation error: ", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

//Course Deletion Route
adminRouter.delete("/course/:courseId", adminMiddleware, async function(req, res) {
    const courseId = req.params.courseId;
    const adminId = req.adminId;

    try {
        const deletedCourse = await courseModel.findOneAndDelete({
            _id: courseId,
            creatorId: adminId
        });

        if(!deletedCourse) {
            return res.status(404).send({
                message: "Course not found"
            });
        }

        res.status(200).send({
            message: "Course deleted succesfully!",
            course: deletedCourse
        });
    } catch(error) {
        console.error("Course deletion error: ", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

//Course Display Route
adminRouter.get("/course/bulk", adminMiddleware, async function(req, res) {
    const adminId = req.adminId;

    try {
        const adminCourses = await courseModel.find({ creatorId: adminId });

        if(adminCourses.length === 0) {
            return res.status(404).send({
                message: "No courses found"
            });
        }
    
        res.status(200).send({
            message: "All courses are sucessfully displayed",
            course: adminCourses
        });
    } catch(error) {
        console.log("Course fetch error: ", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

module.exports = {
    adminRouter: adminRouter
}