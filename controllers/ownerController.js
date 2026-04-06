import imagekit from "../configs/imageKit.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import fs from "fs";

// ✅ Import logger
import { logger, vehicleLogger } from "../middlewares/logging.js";

// Change Role
export const changeRoleToOwner = async (req, res) => {
  try {
    const { _id } = req.user;

    await User.findByIdAndUpdate(_id, { role: "owner" });

    logger.info("User role updated to owner", {
      userId: _id,
      requestId: req.id,
    });

    res.json({ success: true, message: "Now you can lists cars" });
  } catch (e) {
    logger.error("Change role failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

//  Add Car
export const addCar = async (req, res) => {
  try {
    const { _id } = req.user;

    let car = JSON.parse(req.body.carData);
    const imageFile = req.file;

    const fileBuffer = fs.createReadStream(imageFile.path);

    const response = await imagekit.files.upload({
      file: fileBuffer,
      fileName: imageFile.originalname,
      folder: "/cars",
    });

    const optimizedImageUrl = imagekit.helper.buildSrc({
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      src: response.filePath,
      transformation: [
        { width: 1280 },
        { quality: "auto" },
        { format: "webp" },
      ],
    });

    const image = optimizedImageUrl;

    const newCar = await Car.create({ ...car, owner: _id, image });

    vehicleLogger.added(newCar._id);

    logger.info("Car added successfully", {
      carId: newCar._id,
      ownerId: _id,
      requestId: req.id,
    });

    res.json({ success: true, message: "Car Added" });
  } catch (error) {
    logger.error("Add car failed", {
      message: error.message,
      requestId: req.id,
    });

    res.json({ success: false, message: error.message });
  }
};

// 📋 Owner Cars
export const getOwnerCars = async (req, res) => {
  try {
    const { _id } = req.user;

    const cars = await Car.find({ owner: _id });

    logger.info("Fetched owner cars", {
      ownerId: _id,
      count: cars.length,
      requestId: req.id,
    });

    res.json({ success: true, cars });
  } catch (e) {
    logger.error("Fetching owner cars failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 🔁 Toggle Availability
export const toggleCarAvailability = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;

    const car = await Car.findById(carId);

    if (car.owner.toString() !== _id.toString()) {
      logger.warn("Unauthorized toggle attempt", {
        userId: _id,
        carId,
        requestId: req.id,
      });

      return res.json({ success: false, message: "Unauthorized" });
    }

    car.isAvailable = !car.isAvailable;
    await car.save();

    logger.info("Car availability toggled", {
      carId,
      ownerId: _id,
      newStatus: car.isAvailable,
      requestId: req.id,
    });

    res.json({ success: true, message: "Availability Toggled" });
  } catch (error) {
    logger.error("Toggle availability failed", {
      message: error.message,
      requestId: req.id,
    });

    res.json({ success: false, message: error.message });
  }
};

// ❌ Delete Car (Soft delete)
export const deleteCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;

    const car = await Car.findById(carId);

    if (car.owner.toString() !== _id.toString()) {
      logger.warn("Unauthorized car delete attempt", {
        userId: _id,
        carId,
        requestId: req.id,
      });

      return res.json({ success: false, message: "Unauthorized" });
    }

    car.owner = null;
    car.isAvailable = false;
    await car.save();

    logger.info("Car soft deleted", {
      carId,
      previousOwner: _id,
      requestId: req.id,
    });

    res.json({ success: true, message: "Car Removed" });
  } catch (error) {
    logger.error("Delete car failed", {
      message: error.message,
      requestId: req.id,
    });

    res.json({ success: false, message: error.message });
  }
};

// 📊 Dashboard Data
export const getDashboardData = async (req, res) => {
  try {
    const { _id, role } = req.user;

    if (role !== "owner") {
      logger.warn("Unauthorized dashboard access", {
        userId: _id,
        requestId: req.id,
      });

      return res.json({ success: false, message: "Unauthorized" });
    }

    const cars = await Car.find({ owner: _id });
    const bookings = await Booking.find({ owner: _id })
      .populate("car")
      .sort({ createdAt: -1 });

    const pendingBookings = await Booking.find({
      owner: _id,
      status: "pending",
    });

    const completedBookings = await Booking.find({
      owner: _id,
      status: "confirmed",
    });

    const monthlyRevenue = bookings
      .filter((b) => b.status === "confirmed")
      .reduce((acc, b) => acc + b.price, 0);

    logger.info("Dashboard data fetched", {
      ownerId: _id,
      totalCars: cars.length,
      totalBookings: bookings.length,
      revenue: monthlyRevenue,
      requestId: req.id,
    });

    res.json({
      success: true,
      dashboardData: {
        totalCars: cars.length,
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
        completedBookings: completedBookings.length,
        recentBookings: bookings.slice(0, 3),
        monthlyRevenue,
      },
    });
  } catch (e) {
    logger.error("Dashboard fetch failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 🖼️ Update User Image
export const updateUserImage = async (req, res) => {
  try {
    const { _id } = req.user;
    const imageFile = req.file;

    const fileBuffer = fs.createReadStream(imageFile.path);

    const response = await imagekit.files.upload({
      file: fileBuffer,
      fileName: imageFile.originalname,
      folder: "/users",
    });

    const optimizedImageUrl = imagekit.helper.buildSrc({
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      src: response.filePath,
      transformation: [
        { width: 400 },
        { quality: "auto" },
        { format: "webp" },
      ],
    });

    await User.findByIdAndUpdate(_id, { image: optimizedImageUrl });

    logger.info("User image updated", {
      userId: _id,
      requestId: req.id,
    });

    res.json({ success: true, message: "Image Updated" });
  } catch (e) {
    logger.error("Update user image failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};