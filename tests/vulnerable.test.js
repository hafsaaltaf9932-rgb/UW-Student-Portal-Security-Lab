const request = require("supertest");
const app = require("../src/vulnerable-app");

const auth = t => ["Authorization", `Bearer ${t}`];

// V1: Missing Authentication
test("V1 - Result accessible without token", async () => {
    const r = await request(app)
        .get("/api/public-results/1001");

    expect(r.status).toBe(200);
});

// V2: IDOR
test("V2 - Student reads another result", async () => {
    const r = await request(app)
        .get("/api/results/1002")
        .set(...auth("student-token"));

    expect(r.status).toBe(200);
    expect(r.body.studentId).toBe(1002);
});

// V3: Missing Role Check
test("V3 - Student accesses admin users", async () => {
    const r = await request(app)
        .get("/api/admin/users")
        .set(...auth("student-token"));

    expect(r.status).toBe(200);
});

// V4: Role Tampering
test("V4 - Fake admin role accepted", async () => {
    const r = await request(app)
        .get("/api/admin/stats")
        .set("X-Role", "admin");

    expect(r.status).toBe(200);
});

// V5: Mass Assignment
test("V5 - Student changes role to admin", async () => {
    const { users } = require("../src/data");
    const student = users.find(u => u.id === 1001);

    try {
        const r = await request(app)
            .put("/api/profile")
            .set(...auth("student-token"))
            .send({ role: "admin" });

        expect(r.status).toBe(200);
        expect(r.body.role).toBe("admin");
    } finally {
        student.role = "student";
    }
});

// V6: Path Traversal
test("V6 - Unauthorized file access", async () => {
    const r = await request(app)
        .get("/api/files")
        .query({ name: "../package.json" });

    expect(r.status).toBe(200);
});

// V7: Missing Delete Authorization
test("V7 - Student deletes another user", async () => {
    const { users } = require("../src/data");
    const originalUsers = [...users];

    try {
        const r = await request(app)
            .delete("/api/admin/users/1002")
            .set(...auth("student-token"));

        expect(r.status).toBe(200);
    } finally {
        users.splice(0, users.length, ...originalUsers);
    }
});