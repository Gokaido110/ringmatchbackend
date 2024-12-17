const axios = require('axios');
const mongoose = require('mongoose');

// Load MongoDB URI and token from environment variables
const mongoURI = "mongodb+srv://gokaido110:whynot12@cluster0.uaza1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmOTgzYmNlOC0wMTlmLTQwMzItYTU5Ny02NDY0MTI2OWZiMGIiLCJpYXQiOjE3MzQzNTIzNzUsImV4cCI6MTczNDM1MzU3NX0.bgt9Pa0gyrxJMqjAJzPrfgsL_k_EEsFvw7UaFnycI1E";

// MongoDB Payment Model
const Payment = mongoose.model('Orders', new mongoose.Schema({
  paymentId: String,
  status: String,
  transaction: Object,
  user_uid: String,
  memo: String,
  amount: Number,
}));

// Connect to MongoDB
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to database'))
  .catch((err) => console.error('Database connection error:', err));

// Function to complete the payment
async function completePaymentDirectly(paymentData) {
  try {
    // Save the payment record to MongoDB
    const payment = new Payment({
      paymentId: paymentData.identifier,
      status: 'completed',
      transaction: {
        txid: paymentData.txid,
        verified: true,
        _link: `https://api.testnet.minepi.com/transactions/${paymentData.txid}`,
      },
      user_uid: paymentData.user_uid,
      memo: paymentData.memo,
      amount: paymentData.amount,
    });

    await payment.save();
    console.log('Payment saved:', payment);

    // Send payment completion request to backend
    const response = await axios.post('http://localhost:9000/payments/complete', {
      paymentId: paymentData.identifier,
      txid: paymentData.txid,
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Backend response:', response.data);
  } catch (error) {
    console.error('Error completing payment:', error.message);
  }
}

// Execute the function with dynamic data
const paymentData = {
  identifier: '3XV1J0psFwawSFcm2v6OSXFMWYSx',
  txid: '27cca73c4f4b83c9136d3c918b356408ce585ce57113151342eb2097aa112c9a',
  user_uid: 'f983bce8-019f-4032-a597-64641269fb0b',
  amount: 3,
  memo: 'Order Apple Pie',
};

completePaymentDirectly(paymentData);
