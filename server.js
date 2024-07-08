require('dotenv').config();
const express = require('express');
const userService = require('./user-service.js');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const passportJWT = require('passport-jwt');

// Enhanced CORS configuration
const corsOptions = {
  origin:
    process.env.ALLOWED_ORIGIN || 'https://blorchestra.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use(express.json());

// JSON Web Token Setup
const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('jwt'),
  secretOrKey: process.env.JWT_SECRET,
};

// Setup JWT strategy
const strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
  if (jwt_payload) {
    next(null, {
      _id: jwt_payload._id,
      userName: jwt_payload.userName,
    });
  } else {
    next(null, false);
  }
});

passport.use(strategy);
app.use(passport.initialize());

// Helper function for error responses
const sendErrorResponse = (res, statusCode, message) => {
  res.status(statusCode).json({ message });
};

// Routes
app.post('/api/user/register', (req, res) => {
  userService
    .registerUser(req.body)
    .then((msg) => res.json({ message: msg }))
    .catch((msg) => sendErrorResponse(res, 422, msg));
});

app.post('/api/user/login', (req, res) => {
  userService
    .checkUser(req.body)
    .then((user) => {
      const payload = { _id: user._id, userName: user.userName };
      const token = jwt.sign(payload, jwtOptions.secretOrKey, {
        expiresIn: '1h',
      });
      res.json({ message: 'login successful', token });
    })
    .catch((msg) => sendErrorResponse(res, 422, msg));
});

// Middleware for JWT authentication
const authenticateJWT = passport.authenticate('jwt', {
  session: false,
});

app.get('/api/user/favourites', authenticateJWT, (req, res) => {
  userService
    .getFavourites(req.user._id)
    .then((data) => res.json(data))
    .catch((err) => sendErrorResponse(res, 422, err));
});

app.put('/api/user/favourites/:id', authenticateJWT, (req, res) => {
  userService
    .addFavourite(req.user._id, req.params.id)
    .then((data) => res.json(data))
    .catch((err) => sendErrorResponse(res, 422, err));
});

app.delete(
  '/api/user/favourites/:id',
  authenticateJWT,
  (req, res) => {
    userService
      .removeFavourite(req.user._id, req.params.id)
      .then((data) => res.json(data))
      .catch((err) => sendErrorResponse(res, 422, err));
  },
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const HTTP_PORT = process.env.PORT || 3000;
userService
  .connect()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log(`API listening on port ${HTTP_PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to start the server:', err);
    process.exit(1);
  });
