const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.set('useFindAndModify', false);

const mongoDBConnectionString = process.env.MONGO_URL;
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    userName: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    favourites: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

let User;

const connect = () => {
  return new Promise((resolve, reject) => {
    const db = mongoose.createConnection(mongoDBConnectionString, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useCreateIndex: true,
    });

    db.on('error', (err) => reject(err));
    db.once('open', () => {
      User = db.model('users', userSchema);
      resolve();
    });
  });
};

const registerUser = async (userData) => {
  if (userData.password !== userData.password2) {
    throw new Error('Passwords do not match');
  }

  try {
    const hash = await bcrypt.hash(userData.password, 10);
    const newUser = new User({
      userName: userData.userName,
      password: hash,
    });

    await newUser.save();
    return `User ${userData.userName} successfully registered`;
  } catch (err) {
    if (err.code === 11000) {
      throw new Error('User Name already taken');
    }
    throw new Error(
      `There was an error creating the user: ${err.message}`,
    );
  }
};

const checkUser = async (userData) => {
  const user = await User.findOne({ userName: userData.userName });
  if (!user) {
    throw new Error(`Unable to find user ${userData.userName}`);
  }

  const isMatch = await bcrypt.compare(
    userData.password,
    user.password,
  );
  if (!isMatch) {
    throw new Error(
      `Incorrect password for user ${userData.userName}`,
    );
  }

  return user;
};

const getFavourites = async (id) => {
  try {
    const user = await User.findById(id);
    return user.favourites;
  } catch (err) {
    throw new Error(
      `Unable to get favourites for user with id: ${id}`,
    );
  }
};

const addFavourite = async (id, favId) => {
  try {
    const user = await User.findById(id);
    if (user.favourites.length >= 50) {
      throw new Error('Favourites limit reached');
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $addToSet: { favourites: favId } },
      { new: true },
    );
    return updatedUser.favourites;
  } catch (err) {
    throw new Error(
      `Unable to update favourites for user with id: ${id}`,
    );
  }
};

const removeFavourite = async (id, favId) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $pull: { favourites: favId } },
      { new: true },
    );
    return updatedUser.favourites;
  } catch (err) {
    throw new Error(
      `Unable to update favourites for user with id: ${id}`,
    );
  }
};

module.exports = {
  connect,
  registerUser,
  checkUser,
  getFavourites,
  addFavourite,
  removeFavourite,
};
