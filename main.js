console.log("inside main.js");

const express = require("express");
const fs = require("fs");
var bodyParser = require("body-parser");

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static("static"));

app.get("/", (req, res) => {
  res.sendFile("./static/index.html");
});

const PORT = 3001;
app.listen(PORT);
console.log(`Server running on port ${PORT}`);
