const jwt = require("jsonwebtoken");
const { JWT_USER_PASSWORD } = require("../config");

function userMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if(!token) {
        return res.status(400).send({
            message: "Token not found"
        });
    }

    try {
        const decodedData = jwt.verify(token, JWT_USER_PASSWORD);

        if(!decodedData) {
            return res.status(404).send({
                message: "User not found"
            });
        } else {
            req.userId = decodedData.userId;
            next();
        }
    } catch(error) {
        res.status(500).send({
            message: "Token invalid or expired",
            error: error.message
        })
    }
}

module.exports = {
    userMiddleware: userMiddleware
}