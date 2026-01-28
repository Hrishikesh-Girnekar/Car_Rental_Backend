import imagekit from "../configs/imagekit.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import fs from "fs";

// Change Role
export const changeRoleToOwner = async (req, res) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { role: "owner" });
    res.json({ success: true, message: "Now you can lists cars" });
  } catch (e) {
    console.log(e.message);
    res.json({ success: false, message: e.message });
  }
};

// Add Car
export const addCar = async (req, res) => {
  try {
    const { _id } = req.user;
    console.log(req.body.carData);

    let car = JSON.parse(req.body.carData);
    const imageFile = req.file;

    const fileBuffer = fs.createReadStream(imageFile.path);

    // Upload image to imagekit
    const response = await imagekit.files.upload({
      file: fileBuffer,
      fileName: imageFile.originalname,
      folder: "/cars",
    });

    // optimization through imagkit url transformation
    const optimizedImageUrl = imagekit.helper.buildSrc({
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      src: response.filePath,
      transformation: [
        { width: 1280 }, //Width resizing
        { quality: "auto" }, //Auto Compression
        { format: "webp" }, //Convert to modern format
      ],
    });

    const image = optimizedImageUrl;

    await Car.create({ ...car, owner: _id, image });
    res.json({ success: true, message: "Car Added" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// List all cars of owner
export const getOwnerCars = async (req, res) => {
  try {
    const { _id } = req.user;
    const cars = await Car.find({ owner: _id });
    res.json({ success: true, cars });
  } catch (e) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Toggle Availability
export const toggleCarAvailability = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    // Checking is car belongs to the user
    if (car.owner.toString() !== _id.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    car.isAvailable = !car.isAvailable;
    await car.save();

    res.json({ success: true, message: "Availability Toggled" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Delete a car
export const deleteCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;
    const car = await Car.findById(carId);

    // Checking is car belongs to the user
    if (car.owner.toString() !== _id.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Why are we not deleting the car directly? => because if someone has previously booked this car, history should be there to see the details of the car.
    car.owner = null;
    car.isAvailable = false;
    await car.save();

    res.json({ success: true, message: "Car Removed" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get Dashboard Data
//Incomplete
export const getDashboardData = async (req, res) => {
  try {
    const { _id, role } = req.user;

    if (role !== "owner") {
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

    // Calculate monthlyRevenue from bookings where status is confirmed
    const monthlyRevenue = bookings
      .slice()
      .filter((booking) => booking.status === "confirmed")
      .reduce((acc, booking) => acc + booking.price, 0);

    const dashboardData = {
      totalCars: cars.length,
      totalBookings: bookings.length,
      pendingBookings: pendingBookings.length,
      completedBookings: completedBookings.length,
      recentBookings: bookings.slice(0, 3),
      monthlyRevenue,
    };

    res.json({ success: true, dashboardData });
  } catch (e) {
    console.log(e.message);
    res.json({ success: false, message: e.message });
  }
};

// Update user image
export const updateUserImage = async (req, res) => {
  try {

    const { _id } = req.user;
    const imageFile = req.file;

    const fileBuffer = fs.createReadStream(imageFile.path);

    // Upload image to imagekit
    const response = await imagekit.files.upload({
      file: fileBuffer,
      fileName: imageFile.originalname,
      folder: "/users",
    });

    // optimization through imagkit url transformation
    const optimizedImageUrl = imagekit.helper.buildSrc({
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      src: response.filePath,
      transformation: [
        { width: 400 }, //Width resizing
        { quality: "auto" }, //Auto Compression
        { format: "webp" }, //Convert to modern format
      ],
    });

    const image = optimizedImageUrl;
    await User.findByIdAndUpdate(_id, {image});
    res.json({success:true, message: "Image Updated"})
  } catch (e) {
     console.log(e.message);
    res.json({ success: false, message: e.message });
  }
};
