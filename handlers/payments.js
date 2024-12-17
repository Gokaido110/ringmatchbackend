const axios = require("axios");
const express = require("express");
const platformAPIClient = require("../services/platformAPIClient");
const Order = require("../models/orderModel");
const User = require("../models/userModel");
const isAuthenticated = require("../authMiddleware/isAuthenticated");
const admin = require("firebase-admin");
const fs = require("fs");

const router = express.Router();

// Initialize Firebase Admin SDK
const serviceAccount = require("../serviceAccountKey.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const firestore = admin.firestore();

// Handle the incomplete payment
router.post("/incomplete", isAuthenticated, async (req, res) => {
  try {
    const payment = req.body.payment;
    const paymentId = payment.identifier;
    const txid = payment.transaction && payment.transaction.txid;
    const txURL = payment.transaction && payment.transaction._link;

    // Find the incomplete order
    const order = await Order.findOne({ pi_payment_id: paymentId });

    // Order doesn't exist
    if (!order) {
      return res.status(400).json({ message: "Order not found" });
    }

    // Check the transaction on the Pi blockchain
    const horizonResponse = await axios.create({ timeout: 20000 }).get(txURL);
    const paymentIdOnBlock = horizonResponse.data.memo;

    // Verify the payment ID matches
    if (paymentIdOnBlock !== order.pi_payment_id) {
      return res.status(400).json({ message: "Payment id doesn't match." });
    }

    // Mark the order as paid in MongoDB
    await Order.updateOne(
      { pi_payment_id: paymentId },
      { $set: { txid, paid: true } }
    );

    // Mark the order as paid in Firestore under the user's order collection
    const orderRef = firestore.collection("users").doc(order.user).collection("orders").doc(paymentId);
    await orderRef.set(
      {
        pi_payment_id: paymentId,
        txid: txid,
        paid: true,
        updated_at: new Date(),
      },
      { merge: true }
    );

    // Increment user balance in MongoDB
    const currentUser = req.currentUser;
    if (currentUser) {
      await User.updateOne({ uid: currentUser.uid }, { $inc: { balance: order.amount } });

      // Increment user balance in Firestore
      const userRef = firestore.collection("users").doc(currentUser.uid);
      await userRef.set(
        {
          balance: admin.firestore.FieldValue.increment(order.amount),
        },
        { merge: true }
      );
    }

    // Notify Pi Servers that the payment is completed
    await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });
    return res.status(200).json({ message: `Handled the incomplete payment ${paymentId}` });
  } catch (error) {
    console.error("Error in /incomplete route:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Approve the current payment
router.post("/approve", isAuthenticated, async (req, res) => {
  try {
    console.log("User hit approve route");

    if (!req.currentUser) {
      return res
        .status(401)
        .json({ error: "unauthorized", message: "User needs to sign in first" });
    }

    const paymentId = req.body.paymentId;
    const currentPayment = await platformAPIClient.get(
      `/v2/payments/${paymentId}`
    );

    // Create new order in MongoDB
    const newOrder = await Order.create({
      pi_payment_id: paymentId,
      product_id: currentPayment.data.metadata.productId,
      user: req.currentUser.uid,
      txid: null,
      paid: false,
      cancelled: false,
      created_at: new Date(),
      amount: currentPayment.data.amount,
    });

    // Create new order in Firestore under the user's order collection
    const orderRef = firestore.collection("users").doc(req.currentUser.uid).collection("orders").doc(paymentId);
    await orderRef.set({
      pi_payment_id: paymentId,
      product_id: currentPayment.data.metadata.productId,
      user: req.currentUser.uid,
      txid: null,
      paid: false,
      cancelled: false,
      created_at: new Date(),
      amount: currentPayment.data.amount,
    });

    // Notify Pi server to approve payment
    await platformAPIClient.post(`/v2/payments/${paymentId}/approve`);

    return res.status(200).json({ message: `Approved the payment ${paymentId}` });
  } catch (error) {
    console.error("Error in /approve route:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Completing current payment
router.post("/complete", isAuthenticated, async (req, res) => {
  try {
    if (!req.currentUser) {
      return res
        .status(401)
        .json({ error: "unauthorized", message: "User needs to sign in first" });
    }

    const paymentId = req.body.paymentId;
    const txid = req.body.txid;
    const currentPayment = await platformAPIClient.get(
      `/v2/payments/${paymentId}`
    );

    // Mark the payment as complete in Firestore under the user's order collection
    const orderRef = firestore.collection("users").doc(req.currentUser.uid).collection("orders").doc(paymentId);
    await orderRef.set(
      {
        txid: txid,
        paid: true,
        updated_at: new Date(),
      },
      { merge: true }
    );

    const amountToAdd = parseInt(currentPayment.data.amount, 10) || 0;

    // Add premium status and set validity to 1 month in Firestore
    const userRef = firestore.collection("users").doc(req.currentUser.uid);
    const currentDate = new Date();
    const validUntil = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate()); // Set 1 month from today

    await userRef.set(
      {
        // balance: admin.firestore.FieldValue.increment(amountToAdd),
        premium: true,
        validUntil: validUntil, // Set validity for 1 month
        updated_at: currentDate,
      },
      { merge: true }
    );

    // Notify Pi server that the transaction is completed
    await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });

    return res
      .status(200)
      .json({ message: `Completed the payment ${paymentId}` });
  } catch (error) {
    console.error("Error in /complete route:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



// Handle the cancelled payment
router.post("/cancelled_payment", async (req, res) => {
  try {
    const paymentId = req.body.paymentId;

    // Retrieve the order from MongoDB
    const order = await Order.findOne({ pi_payment_id: paymentId });

    // Check if the order exists
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Extract the user ID from the order
    const userId = order.user;

    // Mark the transaction as cancelled in MongoDB
    await Order.updateOne(
      { pi_payment_id: paymentId },
      { $set: { cancelled: true } }
    );

    // Mark the transaction as cancelled in Firestore under the user's order collection
    const orderRef = firestore.collection("users").doc(userId).collection("orders").doc(paymentId);
    await orderRef.set(
      {
        cancelled: true,
        updated_at: new Date(),
      },
      { merge: true }
    );

    return res
      .status(200)
      .json({ message: `Cancelled the payment ${paymentId}` });
  } catch (error) {
    console.error("Error in /cancelled_payment route:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});


module.exports = router;
