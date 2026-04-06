import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Car from "../models/Car.js";

//Import logger
import { logger } from "../middlewares/logging.js";

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(userId, process.env.JWT_SECRET);
};

// 🔐 Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password || password.length < 8) {
      logger.warn("User registration validation failed", {
        email,
        requestId: req.id,
      });
      return res.json({ success: false, message: "Fill all the fields" });
    }

    const userExist = await User.findOne({ email });

    if (userExist) {
      logger.warn("User already exists", {
        email,
        requestId: req.id,
      });
      return res.json({ success: false, message: "User Already Exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    logger.info("User registered successfully", {
      userId: user._id,
      email,
      requestId: req.id,
    });

    const token = generateToken(user._id.toString());
    res.json({ success: true, token });

  } catch (e) {
    logger.error("User registration failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 🔑 User Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Login failed - user not found", {
        email,
        requestId: req.id,
      });
      return res.json({ success: false, message: "User does not exists" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logger.warn("Login failed - invalid credentials", {
        email,
        requestId: req.id,
      });
      return res.json({ success: false, message: "Invalid Credentials" });
    }

    logger.info("User login successful", {
      userId: user._id,
      email,
      requestId: req.id,
    });

    const token = generateToken(user._id.toString());
    res.json({ success: true, token });

  } catch (e) {
    logger.error("User login error", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 👤 Get user data
export const getUserData = async (req, res) => {
  try {
    const { user } = req;

    logger.info("User data fetched", {
      userId: user._id,
      requestId: req.id,
    });

    res.json({ success: true, user });

  } catch (e) {
    logger.error("Fetching user data failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 🚗 Get Available Cars
export const getCars = async (req, res) => {
  try {
    const cars = await Car.find({ isAvailable: true });

    logger.info("Fetched available cars", {
      count: cars.length,
      requestId: req.id,
    });

    res.json({ success: true, cars });

  } catch (error) {
    logger.error("Fetching cars failed", {
      message: error.message,
      requestId: req.id,
    });

    res.json({ success: false, message: error.message });
  }
};