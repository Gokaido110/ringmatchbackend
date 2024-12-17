const express = require("express");

module.exports = (firestore) => {
  const router = require("express").Router();

  router.post("/add", async (req, res) => {
    try {
      const { uid, paymentId, amount } = req.body;

      // Ensure that all fields are provided
      if (!uid || !paymentId || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Firestore Write
      const userRef = firestore.collection("users").doc(uid);
      await userRef.collection("paymentHistory").doc(paymentId).set({
        amount,
        createdAt: new Date(),
      });

      return res.status(200).json({ message: "Payment added to Firestore" });
    } catch (error) {
      console.error("Error writing to Firestore:", error);
      return res.status(500).json({ error: "Failed to add payment" });
    }
  });

  return router;
};

