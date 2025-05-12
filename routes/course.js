const { Router } = require("express");
const { userMiddleware } = require("../middleware/user");
const { purchaseModel, courseModel } = require("../db")
const courseRouter = Router();

courseRouter.post("/purchase", userMiddleware, async function(req, res) {
    res.send({
        message: "You have successfully bought the course"
    })
})

courseRouter.get("/preview", async function(req, res) {
    res.send({
        message: "Courses displayed"
    });
})

module.exports = {
    courseRouter: courseRouter
}