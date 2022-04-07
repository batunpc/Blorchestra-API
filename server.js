require("dotenv").config();
const express = require("express");
const userService = require("./user-service.js");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());
//JWT setup
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");
// JSON Web Token Setup
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme("jwt"),
  secretOrKey: process.env.JWT_SECRET,
};
//setup strategy
const strategy = new JwtStrategy(jwtOptions, function (jwt_payload, next) {
  console.log("payload received", jwt_payload);
  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName,
    });
  } else next(null, false); //prevent the acccess to next route
});
passport.use(strategy);
app.use(passport.initialize()); // add passport as application-level middleware

//Routes
//=======
app.post("/api/user/register", (req, res) => {
  userService
    .registerUser(req.body)
    .then((msg) => {
      res.json({ message: msg });
    })
    .catch((msg) => {
      res.status(422).json({ message: msg });
    });
});

app.post("/api/user/login", (req, res) => {
  userService
    .checkUser(req.body)
    .then((user) => {
      var payload = {
        _id: user._id,
        userName: user.userName,
      };
      var token = jwt.sign(payload, process.env.JWT_SECRET);

      res.json({ message: "login successful", token: token });
    })
    .catch((msg) => {
      res.status(422).json({ message: msg });
    });
});

app.get(
  "/api/user/favourites",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    dataService
      .getFavorites(req.user._id)
      .then((data) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

app.put(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    dataService
      .addFavourite(req.user._id)
      .then((data) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

app.delete(
  "/api/user/favourites/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    dataService
      .removeFavourite(req.user._id)
      .then((data) => {
        res.json(data);
      })
      .catch((err) => {
        res.status(422).json({ message: err });
      });
  }
);

const HTTP_PORT = process.env.PORT;
userService
  .connect()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
  });
