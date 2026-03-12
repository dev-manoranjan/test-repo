function getData(req, res) {
  const id = req.query.id;
  const sql = "SELECT * FROM data WHERE id=" + id;
  db.query(sql, (err, result) => {
    res.send(result);
  });
}
