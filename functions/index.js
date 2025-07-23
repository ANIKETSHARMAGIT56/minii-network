const functions = require('firebase-functions/v1');

// Trigger when a new user signs up via Firebase Authentication
exports.onUserCreated = functions.auth.user().onCreate((user) => {
  return admin.database().ref(`/users/${user.uid}`).set({
    email: user.email || null,
    createdAt: Date.now()
  });
});