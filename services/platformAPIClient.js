const axios = require("axios");

const platformAPIClient = axios.create({
  baseURL: "https://api.minepi.com",
  timeout: 20000,
  headers: {
    Authorization: `Key ndk3imryb59utcdgoclzcc5j2zefnbl0xj2n4hihd0b0xr7ylwjqtqupmvspgf9d`,
  },
});

module.exports = platformAPIClient;
