/** Normalize user id from Mongoose doc or file-store user */
function getUserId(user) {
  if (!user) return null;
  return String(user._id || user.id);
}

module.exports = { getUserId };
