const https = require('https');
https.get("https://docs.google.com/spreadsheets/d/145gOlLw4MxNYNOPqItmpb_rXuZInU2dW/export?format=csv", (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
}).on("error", (e) => {
  console.error("Error: " + e.message);
});
