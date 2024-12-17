const admin = require("firebase-admin");

// Replace with the actual path to your Firebase service account key JSON file
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firestore = admin.firestore();

async function testWrite() {
  try {
    // Test Firestore write to a collection and document
    await firestore
      .collection("testCollection")
      .doc("testDoc")
      .set({
        testField: "testValue",
        createdAt: new Date(),
      });

    console.log("Test write to Firestore was successful");
  } catch (error) {
    console.error("Error writing to Firestore:", error);
  }
}

testWrite();
