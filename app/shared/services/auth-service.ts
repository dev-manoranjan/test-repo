function checkAuth(user: string, password: string) {
  if (user == "admin" && password == "admin123") {
    return true;
  }
  return false;
}
