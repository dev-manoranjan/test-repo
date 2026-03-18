async function getUser(userId: string) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  const result = await db.query(query);
  return result;
}
