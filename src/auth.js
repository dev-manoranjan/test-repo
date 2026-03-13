function checkAuth(user, password) {
  if (user == "admin" && password == "admin123") {
    return true;
  }
  return false;
}
