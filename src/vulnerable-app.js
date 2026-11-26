const express = require("express");
const { users, results, tokens } = require("./data");
const app = express();
app.use(express.json());
// Demo authentication
app.use((req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const userId = tokens[token];
  req.user = users.find(u => u.id === userId) || null;
  next();
});
// V1 - Missing Authentication
app.get("/api/public-results/:id", (req, res) => {
  const result = results.find(
    r => r.studentId === Number(req.params.id)
  );
  res.json(result || { message: "Not found" });
});
// V2 - IDOR (No Ownership Check)
app.get("/api/results/:id", (req, res) => {
  if (!req.user)
    return res.status(401).json({ message: "Login required" });

  const result = results.find(
    r => r.studentId === Number(req.params.id)
  );
  res.json(result || { message: "Not found" });
});
// V3 - Missing Role Check
app.get("/api/admin/users", (req, res) => {
  if (!req.user)
    return res.status(401).json({ message: "Login required" });

  res.json(users);
});
// V4 - Role Tampering
app.get("/api/admin/stats", (req, res) => {
  if (req.headers["x-role"] === "admin")
    return res.json({ totalUsers: users.length });
  res.status(403).json({ message: "Access denied" });
});
// V5 - Mass Assignment
app.put("/api/profile", (req, res) => {
  if (!req.user)
    return res.status(401).json({ message: "Login required" });
 Object.assign(req.user, req.body);
  res.json(req.user);
});
// V6 - Path Traversal (Training Example)
app.get("/api/files", (req, res) => {
  const path = require("path");
  const filename = req.query.name || "";
  const filePath = path.join(__dirname, "../reports", filename);
  res.sendFile(filePath);
});
// V7 - Missing Delete Authorization
app.delete("/api/admin/users/:id", (req, res) => {
  if (!req.user)
    return res.status(401).json({ message: "Login required" });
  const index = users.findIndex(
    u => u.id === Number(req.params.id)
  );
  if (index === -1)
    return res.status(404).json({ message: "User not found" });
  users.splice(index, 1);
  res.json({ message: "User deleted" });
});
module.exports = app;
