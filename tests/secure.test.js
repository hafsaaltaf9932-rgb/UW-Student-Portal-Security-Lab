const request = require("supertest");
const app = require("../src/app");
const { hasPermission } = require("../src/policies");
const auth = t => ["Authorization", `Bearer ${t}`];
// Test 1: Student reads own result
test("Student reads own result", async () => {
    const r = await request(app)
        .get("/api/results/1001")
        .set(...auth("student-token"));
    expect(r.status).toBe(200);
    expect(r.body.studentId).toBe(1001);
});
// Test 2: Teacher reads another student result
test("Teacher reads another student result", async () => {
    const r = await request(app)
        .get("/api/results/1002")
        .set(...auth("teacher-token"));
    expect(r.status).toBe(200);
});
// Test 3: Admin reads user list
test("Admin reads user list", async () => {
    const r = await request(app)
        .get("/api/admin/users")
        .set(...auth("admin-token"));
    expect(r.status).toBe(200);
});
// Test 4: Missing or invalid token
test("Missing or invalid token receives 401", async () => {
    const r = await request(app)
        .get("/api/results/1001");
 expect(r.status).toBe(401);
    const invalid = await request(app)
        .get("/api/results/1001")
        .set(...auth("invalid-token"));
    expect(invalid.status).toBe(401);
});
// Test 5: IDOR
test("Student cannot read another result", async () => {
    const r = await request(app)
        .get("/api/results/1002")
        .set(...auth("student-token"));
    expect(r.status).toBe(403);
});
// Test 6: Unauthorized admin access
test("Student and teacher cannot access admin panel", async () => {
    for (const token of ["student-token", "teacher-token"]) {
        const r = await request(app)
            .get("/api/admin/users")
            .set(...auth(token));
        expect(r.status).toBe(403);
        const stats = await request(app)
            .get("/api/admin/stats")
            .set(...auth(token));
        expect(stats.status).toBe(403);
    }
});
// Test 7: Role tampering
test("Fake admin role is rejected", async () => {
    const r = await request(app)
        .get("/api/admin/stats")
        .set(...auth("student-token"))
        .set("X-Role", "admin");
    expect(r.status).toBe(403);
});
//Test 8: Mass assignment
test("Student cannot change role", async () => {
    const r = await request(app)
        .put("/api/profile")
        .set(...auth("student-token"))
        .send({ role: "admin" });
    expect(r.status).toBe(200);
    expect(r.body.role).toBe("student");
});
// Test 9: Unauthorized report download
test("Student cannot download report", async () => {
    const r = await request(app)
        .get("/api/files")
        .query({ name: "summary.txt" })
        .set(...auth("student-token"));
    expect(r.status).toBe(403);
});
// Test 10: Path traversal
test("Path traversal is blocked", async () => {
    const r = await request(app)
        .get("/api/files")
        .query({ name: "../package.json" })
        .set(...auth("teacher-token"));
    expect(r.status).toBe(403);
});
// Test 11: Unauthorized deletion
test("Student cannot delete user", async () => {
    const r = await request(app)
        .delete("/api/admin/users/1002")
        .set(...auth("student-token"));
    expect(r.status).toBe(403);
});
// Test 12: Unknown route
test("Unknown route receives 404", async () => {
    const r = await request(app)
        .get("/api/unknown");
    expect(r.status).toBe(404);
});
// Test 13: Unknown role and permission
test("Unknown role or permission is rejected", () => {
    expect(hasPermission("hacker", "view_own_result"))
        .toBe(false);
    expect(hasPermission("student", "unknown_permission"))
        .toBe(false);
});