const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();


//when user is created , it creates a node in the rtdb

exports.onUserCreated = functions.auth.user().onCreate((user) => {
  return admin.database().ref(`/users/${user.uid}`).set({
    email: user.email || null,
    createdAt: Date.now()
  });
});
