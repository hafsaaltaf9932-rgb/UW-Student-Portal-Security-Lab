const { users, tokens } = require("./data");
const { hasPermission } = require("./policies");

// Authentication middleware
function authenticate(req, res, next) {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer ([^\s]+)$/);
    const token = match ? match[1] : "";

    const userId = tokens[token];
    const user = users.find(u => u.id === userId);

    if (!user) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    req.user = user;
    next();
}

// Authorization middleware
function authorize(permission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        if (!hasPermission(req.user.role, permission)) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }

        next();
    };
}

module.exports = { authenticate, authorize };