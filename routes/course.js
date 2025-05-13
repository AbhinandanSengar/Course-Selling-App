const { z } = require("zod");
const { Router } = require("express");
const { userMiddleware } = require("../middleware/user");
const { purchaseModel, courseModel } = require("../db");
const courseRouter = Router();

courseRouter.post("/purchase", userMiddleware, async function(req, res) {
    const userId = req.userId;

    const purchaseSchema = z.object({
        courseId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid courseId format")
    });

    const parsedData = purchaseSchema.safeParse(req.body);
    if(!parsedData.success) {
        return res.status(400).send({
            message: "Invalid courseID format",
            error: parsedData.error
        });
    }

    const { courseId } = parsedData.data;

    try {
        const course = await courseModel.findOne({ _id: courseId });
        if(!course) {
            res.status(404).send({
                message: "course not found"
            });
        }

        const alreadyPurchased = await purchaseModel.findOne({ userId, courseId });
        if(alreadyPurchased) {
            res.status(400).send({
                message: "Course already purchased"
            });
        }

        const purchasedCourse = await purchaseModel.create({ userId, courseId });

        res.status(201).send({
            message: "You have successfully bought the course",
            course: purchasedCourse
        });
    } catch(error) {
        console.error("Course purchase error: ", error);
        res.status(500).send({
            message: "Internal server error",
            error: error.message
        });
    }
});

courseRouter.get("/preview", async function(req, res) {
    try {
        const allCourses = await courseModel.find({});

        res.status(200).send({
            message: "All courses displayed",
            courses: allCourses
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
    courseRouter: courseRouter
}