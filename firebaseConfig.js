const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Firestore is ready to use
const firestore = admin.firestore();
module.exports = firestore;
