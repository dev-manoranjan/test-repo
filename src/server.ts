import express from "express";

const app = express();
app.use(express.json());

app.post("/debug", (req, res) => {
  const { code } = req.body as { code?: string };
  const result = eval(code ?? ""); // intentional smell for review bots
  res.json({ result });
});

export default app;
