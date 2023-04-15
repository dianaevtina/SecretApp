require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
  login: String,
  password: String
});

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login", {alertMessage: "Hidden text.", vis: "hidden"});
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  res.render("secrets");
});

app.get("/logout", function(req, res){
  res.render("home");
});

app.post("/register", function(req, res){
  const newUser = new User({
    login: req.body.username,
    password: md5(req.body.password)
  });
  newUser.save();
  console.log("Added user to database.");
  res.redirect("/secrets");
});

app.post("/login", function(req,res){
  const enteredLogin = req.body.username;
  const enteredPassword = md5(req.body.password);
  async function findDocument(){
    let result = await User.findOne({login: enteredLogin});
    if (result){
      if(result.password === enteredPassword){
        res.render("secrets");
      }
      else{
        res.render("login", {alertMessage: "Incorrect password.", vis: "visible"});
      }
    }
    else{
      res.render("login", {alertMessage: "Incorrect user.", vis: "visible"});
    }
  }
  findDocument();
});

app.listen(3000, function(){
  console.log("Server started on port 3000.");
});
