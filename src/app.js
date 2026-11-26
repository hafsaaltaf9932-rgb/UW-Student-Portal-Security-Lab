const express = require("express");
const path = require("path");
const { users, results } = require("./data");
const { authenticate, authorize } = require("./auth");
const { hasPermission } = require("./policies");
const app = express();
app.use(express.json());
// V1 and V2 Fix: Authentication and ownership check
function getResult(req, res) {
    const id = Number(req.params.id);
    if (!hasPermission(req.user.role, "view_all_results")) {
        if (req.user.id !== id ||
            !hasPermission(req.user.role, "view_own_result")) {
            return res.status(403).json({
                message: "Forbidden"
            });
        }
    }
    const result = results.find(r => r.studentId === id);
    if (!result) {
        return res.status(404).json({
            message: "Not found"
        });
    }
    res.json(result);
}
app.get("/api/public-results/:id", authenticate, getResult);
app.get("/api/results/:id", authenticate, getResult);
// V3 Fix: Admin permission check
app.get("/api/admin/users",
    authenticate,
    authorize("manage_users"),
    (req, res) => {
        res.json(users);
    }
);
// V4 Fix: Verify actual user role
app.get("/api/admin/stats",
    authenticate,
    authorize("view_admin_panel"),
    (req, res) => {
        res.json({ totalUsers: users.length });
    }
);
// V5 Fix: Allow only safe profile fields
app.put("/api/profile",
    authenticate,
    authorize("update_own_profile"),
    (req, res) => {
        if (typeof req.body?.name === "string") {
            req.user.name = req.body.name;
        }
      res.json(req.user);
    }
);
// V6 Fix: Restrict file access
app.get("/api/files",
    authenticate,
    authorize("download_reports"),
    (req, res) => {
        if (req.query.name !== "summary.txt") {
            return res.status(403).json({
                message: "Forbidden"
            });
        }
      res.sendFile(
            path.join(__dirname, "../reports/summary.txt")
        );
    }
);
// V7 Fix: Admin-only delete permission
app.delete("/api/admin/users/:id",
    authenticate,
    authorize("manage_users"),
    (req, res) => {
        const index = users.findIndex(
            u => u.id === Number(req.params.id)
        );
              if (index === -1) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        users.splice(index, 1);
        res.json({ message: "User deleted" });
    }
);
module.exports = app;