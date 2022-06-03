const mongoose = require("mongoose");

const url = process.env.MONGODB_URI;
console.log("connecting to", url);
mongoose
  .connect(url)
  .then((result) => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connecting to MongoDB:", error.message);
  });

const adviceSchema = new mongoose.Schema({
  content: String,
  description: String,
  author_name: String,
  author_id: Number,
});

module.exports = mongoose.model("Advice", adviceSchema);
