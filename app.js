require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

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

const dbUser = process.env.USER;
const dbPassword = process.env.PASSWORD;

mongoose.connect("mongodb+srv://" + dbUser + ":" + dbPassword + "@cluster0.jzfhkdp.mongodb.net/userDB");

const userSchema = new mongoose.Schema({
  login: String,
  password: String,
  googleID: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({username: profile.displayName, googleID: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
});


app.get("/login", function(req, res){
  res.render("login", {alertMessage: "Hidden text.", vis: "hidden"});
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  async function findSecret(){
    let foundUsers = await User.find({secret: {$ne:null}});
    if (foundUsers.length != 0){
      res.render("secrets", {usersWithSecrets: foundUsers});
    }
    else{
      const defaultSecretUser = new User({
        login: "default",
        secret: "I love taking integrals in my free time."
      });
      await defaultSecretUser.save();
      res.render("secrets", {usersWithSecrets: defaultSecretUser});
    }
  }
  findSecret();
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  } else{
    res.redirect("/login");
  }
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
        passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  async function findUser(){
    let result = await User.findById(req.user.id);
    if(result){
      result.secret = submittedSecret;
      result.save();
      res.redirect("/secrets");
    }
    else{
      res.redirect("/login");
    }
  }
  findUser();
});

app.listen(3000, function(){
  console.log("Server started on port 3000.");
});
