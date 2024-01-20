const axios = require("axios");

const platformAPIClient = axios.create({
  baseURL: "https://api.minepi.com",
  timeout: 20000,
  headers: {
    Authorization: `Key xnsayii7dngtsmrxhjhmsup0noyfthbpa2gjtsr5aswnnl7qrpdbdt2nxtgiv4fm`,
  },
});

module.exports = platformAPIClient;
