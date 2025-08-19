// functions/index.js
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

// User Creation
exports.UserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    await admin.database().ref(`/users/${user.uid}`).set({
      email: user.email || null,
      emailVerified: user.emailVerified || false,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      displayName: null,
      displayNameSet: false, // New field to track if display name is set
      friends: {},
      outgoingFriendRequests: {},
      incomingFriendRequests: {},
      myAnimation: null,
      receivedAnimations: {},
      sentAnimations: {},
      miniiId: null,
      profilePicture: null,
    });

    console.log(
        `✅ User node created for UID: ${user.uid}, Email: ${user.email}`,
    );
    return {success: true};
  } catch (error) {
    console.error(`❌ Error creating user node for ${user.uid}:`, error);
    throw error;
  }
});

// User Deletion
exports.UserDeleted = functions.auth.user().onDelete(async (user) => {
  try {
    // Get user data first to find their display name
    const userSnapshot = await admin
        .database()
        .ref(`/users/${user.uid}`)
        .once("value");
    const userData = userSnapshot.val();

    // Remove user data
    await admin.database().ref(`/users/${user.uid}`).remove();

    // Remove display name reservation if it exists
    if (userData && userData.displayName) {
      await admin
          .database()
          .ref(`/displayNames/${userData.displayName.toLowerCase()}`)
          .remove();
    }

    // Clean up friend relationships
    const usersRef = admin.database().ref("/users");
    const snapshot = await usersRef.once("value");
    const users = snapshot.val();

    if (users) {
      const updates = {};
      Object.keys(users).forEach((uid) => {
        if (users[uid].friends && users[uid].friends[user.uid]) {
          updates[`/users/${uid}/friends/${user.uid}`] = null;
        }
        if (
          users[uid].incomingFriendRequests &&
          users[uid].incomingFriendRequests[user.uid]
        ) {
          updates[`/users/${uid}/incomingFriendRequests/${user.uid}`] = null;
        }
        if (
          users[uid].outgoingFriendRequests &&
          users[uid].outgoingFriendRequests[user.uid]
        ) {
          updates[`/users/${uid}/outgoingFriendRequests/${user.uid}`] = null;
        }
        if (
          users[uid].receivedAnimations &&
          users[uid].receivedAnimations[user.uid]
        ) {
          updates[`/users/${uid}/receivedAnimations/${user.uid}`] = null;
        }
        if (
          users[uid].sentAnimations &&
          users[uid].sentAnimations[user.uid]
        ) {
          updates[`/users/${uid}/sentAnimations/${user.uid}`] = null;
        }
      });

      if (Object.keys(updates).length > 0) {
        await admin.database().ref().update(updates);
      }
    }

    console.log(`✅ User and related data deleted for UID: ${user.uid}`);
    return {success: true};
  } catch (error) {
    console.error(`❌ Error deleting user data for ${user.uid}:`, error);
    throw error;
  }
});

// Check if display name is available
exports.checkDisplayNameAvailable = functions.https.onCall(
    async (data, context) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "Must be authenticated",
        );
      }

      const {displayName} = data;

      try {
      // Check if display name exists in displayNames node
        const snapshot = await admin
            .database()
            .ref(`displayNames/${displayName.toLowerCase()}`)
            .once("value");

        return {available: !snapshot.exists()};
      } catch (error) {
        console.error("Error checking display name:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Error checking display name availability",
        );
      }
    },
);

// Set display name for user
exports.setDisplayName = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
    );
  }

  const {displayName} = data;
  const uid = context.auth.uid;

  try {
    // Validate display name
    if (!displayName || displayName.trim().length < 2) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Display name must be at least 2 characters long",
      );
    }

    if (displayName.trim().length > 20) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Display name must be 20 characters or less",
      );
    }

    const cleanDisplayName = displayName.trim();
    const displayNameKey = cleanDisplayName.toLowerCase();

    // Check if display name is available
    const existingSnapshot = await admin
        .database()
        .ref(`displayNames/${displayNameKey}`)
        .once("value");

    if (existingSnapshot.exists() && existingSnapshot.val() !== uid) {
      throw new functions.https.HttpsError(
          "already-exists",
          "Display name is already taken",
      );
    }

    // Update user's display name and reserve it
    const updates = {};
    updates[`users/${uid}/displayName`] = cleanDisplayName;
    updates[`users/${uid}/displayNameSet`] = true;
    updates[`displayNames/${displayNameKey}`] = uid;

    await admin.database().ref().update(updates);

    console.log(`✅ Display name set for ${uid}: ${cleanDisplayName}`);
    return {success: true, message: "Display name set successfully"};
  } catch (error) {
    console.error("Error setting display name:", error);
    throw error;
  }
});

// Send Friend Request - UPDATED TO USE DISPLAY NAME
exports.sendFriendRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated to send friend requests",
    );
  }

  const {targetDisplayName} = data;
  const senderUid = context.auth.uid;

  try {
    // Find target user by display name (case-insensitive)
    const targetDisplayNameLower = targetDisplayName.toLowerCase();

    const usersRef = admin.database().ref("/users");
    const usersSnapshot = await usersRef.once("value");
    const users = usersSnapshot.val();

    let targetUid = null;
    for (const [uid, userData] of Object.entries(users || {})) {
      if (
        userData.displayName &&
        userData.displayName.toLowerCase() === targetDisplayNameLower
      ) {
        targetUid = uid;
        break;
      }
    }

    if (!targetUid) {
      throw new functions.https.HttpsError(
          "not-found",
          "User with this display name not found",
      );
    }

    if (targetUid === senderUid) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Cannot send friend request to yourself",
      );
    }

    // Check if already friends or request exists
    const senderData = users[senderUid];
    if (senderData.friends && senderData.friends[targetUid]) {
      throw new functions.https.HttpsError(
          "already-exists",
          "Already friends with this user",
      );
    }

    if (
      senderData.outgoingFriendRequests &&
      senderData.outgoingFriendRequests[targetUid]
    ) {
      throw new functions.https.HttpsError(
          "already-exists",
          "Friend request already sent",
      );
    }

    // Send friend request
    const timestamp = admin.database.ServerValue.TIMESTAMP;
    const updates = {};
    updates[
        `/users/${senderUid}/outgoingFriendRequests/${targetUid}`
    ] = timestamp;
    updates[
        `/users/${targetUid}/incomingFriendRequests/${senderUid}`
    ] = timestamp;

    await admin.database().ref().update(updates);

    console.log(`✅ Friend request sent from ${senderUid} to ${targetUid}`);
    return {success: true, message: "Friend request sent successfully"};
  } catch (error) {
    console.error("❌ Error sending friend request:", error);
    throw error;
  }
});

// Accept Friend Request
exports.acceptFriendRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
    );
  }

  const {requesterUid} = data;
  const accepterUid = context.auth.uid;

  try {
    const timestamp = admin.database.ServerValue.TIMESTAMP;
    const updates = {};

    // Add as friends
    updates[`/users/${accepterUid}/friends/${requesterUid}`] = timestamp;
    updates[`/users/${requesterUid}/friends/${accepterUid}`] = timestamp;

    // Remove friend requests
    updates[
        `/users/${accepterUid}/incomingFriendRequests/${requesterUid}`
    ] = null;
    updates[
        `/users/${requesterUid}/outgoingFriendRequests/${accepterUid}`
    ] = null;

    await admin.database().ref().update(updates);

    console.log(`✅ Friend request accepted: ${requesterUid} & ${accepterUid}`);
    return {success: true, message: "Friend request accepted"};
  } catch (error) {
    console.error("❌ Error accepting friend request:", error);
    throw error;
  }
});

// Reject Friend Request
exports.rejectFriendRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
    );
  }

  const {requesterUid} = data;
  const rejecterUid = context.auth.uid;

  try {
    const updates = {};
    updates[
        `/users/${rejecterUid}/incomingFriendRequests/${requesterUid}`
    ] = null;
    updates[
        `/users/${requesterUid}/outgoingFriendRequests/${rejecterUid}`
    ] = null;

    await admin.database().ref().update(updates);

    console.log(
        `✅ Friend request rejected: ${requesterUid} by ${rejecterUid}`,
    );
    return {success: true, message: "Friend request rejected"};
  } catch (error) {
    console.error("❌ Error rejecting friend request:", error);
    throw error;
  }
});

// Remove Friend
exports.removeFriend = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
    );
  }

  const {friendUid} = data;
  const userUid = context.auth.uid;

  try {
    const updates = {};
    updates[`/users/${userUid}/friends/${friendUid}`] = null;
    updates[`/users/${friendUid}/friends/${userUid}`] = null;

    await admin.database().ref().update(updates);

    console.log(`✅ Friendship removed: ${userUid} & ${friendUid}`);
    return {success: true, message: "Friend removed successfully"};
  } catch (error) {
    console.error("❌ Error removing friend:", error);
    throw error;
  }
});

// Send Animation
exports.sendAnimation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
    );
  }

  const {targetUid, animationData} = data;
  const senderUid = context.auth.uid;

  try {
    // Verify friendship
    const senderSnapshot = await admin
        .database()
        .ref(`/users/${senderUid}/friends/${targetUid}`)
        .once("value");

    if (!senderSnapshot.exists()) {
      throw new functions.https.HttpsError(
          "permission-denied",
          "Can only send animations to friends",
      );
    }

    const updates = {};
    const animationWithMetadata = {
      ...animationData,
      sentAt: admin.database.ServerValue.TIMESTAMP,
    };

    // Send to friend's received animations
    updates[
        `/users/${targetUid}/receivedAnimations/${senderUid}`
    ] = animationWithMetadata;

    // Add to sender's sent animations
    updates[
        `/users/${senderUid}/sentAnimations/${targetUid}`
    ] = animationWithMetadata;

    await admin.database().ref().update(updates);

    console.log(`✅ Animation sent from ${senderUid} to ${targetUid}`);
    return {success: true, message: "Animation sent successfully"};
  } catch (error) {
    console.error("❌ Error sending animation:", error);
    throw error;
  }
});


// Get friend details for display (server-side read)
exports.getFriendDetails = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
    );
  }

  const {friendUids} = data;
  const currentUid = context.auth.uid;

  try {
    // Verify the requesting user exists and get their friend relationships
    const currentUserSnapshot = await admin
        .database()
        .ref(`/users/${currentUid}`)
        .once("value");
    const currentUserData = currentUserSnapshot.val();

    if (!currentUserData) {
      throw new functions.https.HttpsError(
          "not-found",
          "Current user not found",
      );
    }

    const friendDetails = {};

    for (const uid of friendUids) {
      // Only return details for actual friends or pending requests
      const isFriend = currentUserData.friends && currentUserData.friends[uid];
      const isIncomingRequest = currentUserData.incomingFriendRequests &&
        currentUserData.incomingFriendRequests[uid];
      const isOutgoingRequest = currentUserData.outgoingFriendRequests &&
        currentUserData.outgoingFriendRequests[uid];

      if (isFriend || isIncomingRequest || isOutgoingRequest) {
        const userSnapshot = await admin
            .database()
            .ref(`/users/${uid}`)
            .once("value");
        const userData = userSnapshot.val();

        if (userData) {
          friendDetails[uid] = {
            displayName: userData.displayName || null,
            email: userData.email || null,
            profilePicture: userData.profilePicture || null,
          };
        }
      }
    }

    return {friendDetails};
  } catch (error) {
    console.error("Error getting friend details:", error);
    throw error;
  }
});


// Get all animations for dashboard (personal + friends)
exports.getAllAnimations = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated",
    );
  }

  const currentUid = context.auth.uid;

  try {
    // Get current user's data
    const currentUserSnapshot = await admin
        .database()
        .ref(`/users/${currentUid}`)
        .once("value");
    const currentUserData = currentUserSnapshot.val();

    if (!currentUserData) {
      throw new functions.https.HttpsError(
          "not-found",
          "Current user not found",
      );
    }

    const result = {
      personal: null,
      friends: {},
    };

    // Get personal animation
    if (currentUserData.myAnimation) {
      result.personal = currentUserData.myAnimation;
    }

    // Get friends' animations from receivedAnimations
    if (currentUserData.receivedAnimations) {
      for (const [friendUid, animationData] of Object.entries(
          currentUserData.receivedAnimations,
      )) {
        // Verify this person is actually a friend
        const isFriend = currentUserData.friends &&
          currentUserData.friends[friendUid];

        if (isFriend) {
          // Get friend's display name for better UX
          const friendSnapshot = await admin
              .database()
              .ref(`/users/${friendUid}`)
              .once("value");
          const friendData = friendSnapshot.val();

          result.friends[friendUid] = {
            ...animationData,
            senderName: (friendData && friendData.displayName) ||
              (friendData && friendData.email) || "Unknown Friend",
            senderEmail: (friendData && friendData.email) || "",
          };
        }
      }
    }

    console.log(`✅ Animation data retrieved for user ${currentUid}`);
    return result;
  } catch (error) {
    console.error("Error getting all animations:", error);
    throw error;
  }
});
