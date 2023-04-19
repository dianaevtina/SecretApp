require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
require('dotenv').config();

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
  login: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

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
  if(req.isAuthenticated()){
    res.render("secrets");
  } else{
    res.redirect("/login");
  }
});

app.get("/submit", function(req, res){
  res.render("submit");
});

app.get("/logout", function(req,res){
  req.logout(function(err) {
    if (!err) {
    res.redirect("/");
  }
  });
});

app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user) {
  if (err) {
    if (err.message === "A user with the given username is already registered"){
      res.render("login", {alertMessage: err.message, vis: "visible"});
    }
    else{
      console.log(err);
      res.redirect("/register");
    }
  } else{
      passport.authenticate('local')(req, res, function() {
      res.redirect('/secrets');
    });
  }
});
});

app.post("/login", function(req,res){
  const user = new User({
    login: req.body.username,
    password: req.body.password
  });
  req.login(user, { session: false }, function(err) {
    if (err) {
      if(!user.login){
        res.render("login", {alertMessage: "The user with the entered name does not exist.", vis: "visible"});
      }
      else if(!user.password){
        res.render("login", {alertMessage: "Wrong password.", vis: "visible"});
      }

      console.log(err);
      res.render("login", {alertMessage: "Authentication error.", vis: "visible"});
    }
    else{
        passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
      });
    }
  });
});

app.listen(3000, function(){
  console.log("Server started on port 3000.");
});
