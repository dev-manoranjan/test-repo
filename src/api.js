const express = require("express");
const fs = require("fs");
const app = express();

// No auth middleware, no rate limiting, no input sanitization
app.get("/user", (req, res) => {
  const userId = req.query.id;
  const data = fs.readFileSync(`./data/${userId}.json`); // path traversal
  res.send(data);
});

app.post("/upload", (req, res) => {
  const file = req.body.file;
  fs.writeFileSync("./uploads/" + file.name, file.content); // no size/type check
  res.json({ success: true });
});

app.listen(3000);
