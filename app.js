const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcryptjs");

const mongoDb =
  "mongodb+srv://chmelan:4SQEfdphluvpf3V1@cluster0.lgrv0.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
  })
);

const app = express();

//verify if users exist in the DB when they log in
passport.use(
  new LocalStrategy((username, password, done) => {
    console.log("given password: ", password);
    User.findOne({ username: username }, (err, user) => {
      console.log("db password: ", user.password);
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      bcrypt.compare(password, user.password, (err, res) => {
        if (err) {
          console.log("ERROR");
          return done(error);
        }
        if (res) {
          // passwords match! log user in
          console.log("PASSWORDS MATCHED");
          return done(null, user);
        } else {
          // passwords do not match!
          console.log(res);
          console.log("PASSWORDS DID NOT MATCH");
          return done(null, false, { message: "Incorrect password" });
        }
      });
    });
  })
);

//set session up
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

app.set("views", __dirname);
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index", { user: req.user });
});
app.get("/log-out", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.get("/sign-up", (req, res) => res.render("sign-up-form"));

app.post("/sign-up", (req, res, next) => {
  bcrypt.hash(req.body.password, 10, (err, hashedPassword) => {
    if (err) {
      return next(err);
    }
    console.log(hashedPassword);
    const user = new User({
      username: req.body.username,
      password: hashedPassword,
    }).save((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });
});

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);

app.listen(4000, () => console.log("app listening on port 4000!"));
