const axios = require("axios");
const express = require("express");
const platformAPIClient = require("../services/platformAPIClient");
const Order = require("../models/orderModel");
const isAuthenticated = require("../authMiddleware/isAuthenticated")
const util = require("util")
const fs= require("fs")

const router = express.Router();

// handle the incomplete payment
router.post("/incomplete", async (req, res) => {
  const payment = req.body.payment;
  const paymentId = payment.identifier;
  const txid = payment.transaction && payment.transaction.txid;
  const txURL = payment.transaction && payment.transaction._link;

  /* 
      implement your logic here
      e.g. verifying the payment, delivering the item to the user, etc...

      below is a naive example
    */

  // find the incomplete order

  const order = await Order.findOne({ pi_payment_id: paymentId });

  // order doesn't exist
  if (!order) {
    return res.status(400).json({ message: "Order not found" });
  }

  // check the transaction on the Pi blockchain
  const horizonResponse = await axios.create({ timeout: 20000 }).get(txURL);
  const paymentIdOnBlock = horizonResponse.data.memo;

  // and check other data as well e.g. amount
  if (paymentIdOnBlock !== order.pi_payment_id) {
    return res.status(400).json({ message: "Payment id doesn't match." });
  }

  // mark the order as paid
  await Order.updateOne(
    { pi_payment_id: paymentId },
    { $set: { txid, paid: true } }
  );

  // let Pi Servers know that the payment is completed
  await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });
  return res
    .status(200)
    .json({ message: `Handled the incomplete payment ${paymentId}` });
});

// approve the current payment
router.post("/approve",isAuthenticated ,async (req, res) => {
  console.log("user hitted approve route");

  console.log("-----------current user from approve--------");
  console.log(req.currentUser);
  console.log("jwt id  for userId: " + req.currentUser.uid);
  console.log(req.session);
  console.log("-----------current user from approve--------");

  if (!req.currentUser) {
    return res
      .status(401)
      .json({ error: "unauthorized", message: "User needs to sign in first" });
  }

  const paymentId = req.body.paymentId;
  const currentPayment = await platformAPIClient.get(
    `/v2/payments/${paymentId}`
  );

  /* 
      implement your logic here 
      e.g. creating an order record, reserve an item if the quantity is limited, etc...
    */

  await Order.create({
    pi_payment_id: paymentId,
    product_id: currentPayment.data.metadata.productId,
    user: req.currentUser.uid,
    txid: null,
    paid: false,
    cancelled: false,
    created_at: new Date(),
  });

  console.log("-----------this is current payment--------");
  console.log(currentPayment);
  // fs.writeFileSync("currentPayment.log",currentPayment)
  console.log("-----------this is current payment--------");

  // let Pi Servers know that you're ready
  const response = await platformAPIClient.post(`/v2/payments/${paymentId}/approve`);
  console.log("response from approve : " + util.inspect(response, { depth: 5 }));
  const soleil=util.inspect(response, { depth: 5 })
  fs.writeFileSync("response1.log",soleil)
  return res.status(200).json({ message: `Approved the payment ${paymentId}` });
});

// complete the current payment
router.post("/complete", async (req, res) => {
  const app = req.app;

  const paymentId = req.body.paymentId;
  const txid = req.body.txid;

  /* 
      implement your logic here
      e.g. verify the transaction, deliver the item to the user, etc...
    */

  await Order.updateOne(
    { pi_payment_id: paymentId },
    { $set: { txid: txid, paid: true } }
  );

  // let Pi server know that the payment is completed
  await platformAPIClient.post(`/v2/payments/${paymentId}/complete`, { txid });
  return res
    .status(200)
    .json({ message: `Completed the payment ${paymentId}` });
});

// handle the cancelled payment
router.post("/cancelled_payment", async (req, res) => {
  const paymentId = req.body.paymentId;

  /*
      implement your logic here
      e.g. mark the order record to cancelled, etc...
    */

  await Order.updateOne(
    { pi_payment_id: paymentId },
    { $set: { cancelled: true } }
  );
  return res
    .status(200)
    .json({ message: `Cancelled the payment ${paymentId}` });
});

module.exports = router;
