const jwt = require("jsonwebtoken");
const { JWT_ADMIN_PASSWORD } = require("../config");

function adminMiddleware(req, res, next) {
    const token = req.headers.authorization;

    if(!token) {
        return res.status(400).send({
            message: "Token not found"
        });
    }

    try {
        const decodedData = jwt.verify(token, JWT_ADMIN_PASSWORD);  

        if(!decodedData) {
            return res.status(404).send({
                message: "User not found"
            });
        } else {
            req.adminId = decodedData.id;
            next();
        }
    } catch(error) {
        res.status(500).send({
            message: "Token invalid or expired",
            error: error.message
        });
    }
}

module.exports = {
    adminMiddleware: adminMiddleware
}