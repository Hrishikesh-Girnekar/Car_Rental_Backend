import Booking from "../models/Booking.js";
import Car from "../models/Car.js";

// ✅ Import logger
import { logger, bookingLogger } from "../middlewares/logging.js";

// Function to Check Availability
const checkAvailability = async (car, pickupDate, returnDate) => {
  const bookings = await Booking.find({
    car,
    pickupDate: { $lte: returnDate },
    returnDate: { $gte: pickupDate },
  });
  return bookings.length === 0;
};

// 🔍 Check Availability API
export const checkAvailabilityOfCar = async (req, res) => {
  try {
    const { location, pickupDate, returnDate } = req.body;

    const cars = await Car.find({ location, isAvailable: true });

    const availableCarsPromises = cars.map(async (car) => {
      const isAvailable = await checkAvailability(
        car._id,
        pickupDate,
        returnDate
      );
      return { ...car._doc, isAvailable };
    });

    let availableCars = await Promise.all(availableCarsPromises);
    availableCars = availableCars.filter((car) => car.isAvailable);

    logger.info("Car availability checked", {
      location,
      requestedRange: { pickupDate, returnDate },
      totalCars: cars.length,
      availableCars: availableCars.length,
      requestId: req.id,
    });

    res.json({ success: true, availableCars });

  } catch (e) {
    logger.error("Check availability failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 🧾 Create Booking
export const createBooking = async (req, res) => {
  try {
    const { _id } = req.user;
    const { car, pickupDate, returnDate } = req.body;

    const isAvailable = await checkAvailability(car, pickupDate, returnDate);

    if (!isAvailable) {
      logger.warn("Booking failed - car not available", {
        userId: _id,
        carId: car,
        pickupDate,
        returnDate,
        requestId: req.id,
      });

      return res.json({ success: false, message: "Car is not available" });
    }

    const carData = await Car.findById(car);

    const picked = new Date(pickupDate);
    const returned = new Date(returnDate);
    const noOfDays = Math.ceil((returned - picked) / (1000 * 60 * 60 * 24));
    const price = carData.pricePerDay * noOfDays;

    const booking = await Booking.create({
      car,
      owner: carData.owner,
      user: _id,
      pickupDate,
      returnDate,
      price,
    });

    bookingLogger.created(_id, car);

    logger.info("Booking created successfully", {
      bookingId: booking._id,
      userId: _id,
      carId: car,
      noOfDays,
      price,
      requestId: req.id,
    });

    res.json({ success: true, message: "Booking Created" });

  } catch (e) {
    logger.error("Create booking failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 📋 User Bookings
export const getUserBookings = async (req, res) => {
  try {
    const { _id } = req.user;

    const bookings = await Booking.find({ user: _id })
      .populate("car")
      .sort({ createdAt: -1 });

    logger.info("User bookings fetched", {
      userId: _id,
      count: bookings.length,
      requestId: req.id,
    });

    res.json({ success: true, bookings });

  } catch (e) {
    logger.error("Fetching user bookings failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 🏢 Owner Bookings
export const getOwnerBookings = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      logger.warn("Unauthorized owner bookings access", {
        userId: req.user._id,
        requestId: req.id,
      });

      return res.json({ success: false, message: "Unauthorized" });
    }

    const bookings = await Booking.find({ owner: req.user._id })
      .populate("car user")
      .select("-user.password")
      .sort({ createdAt: -1 });

    logger.info("Owner bookings fetched", {
      ownerId: req.user._id,
      count: bookings.length,
      requestId: req.id,
    });

    res.json({ success: true, bookings });

  } catch (e) {
    logger.error("Fetching owner bookings failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};

// 🔄 Change Booking Status
export const changeBookingStatus = async (req, res) => {
  try {
    const { _id } = req.user;
    const { bookingId, status } = req.body;

    const booking = await Booking.findById(bookingId);

    if (booking.owner.toString() !== _id.toString()) {
      logger.warn("Unauthorized booking status change", {
        userId: _id,
        bookingId,
        requestId: req.id,
      });

      return res.json({ success: false, message: "Unauthorized" });
    }

    booking.status = status;
    await booking.save();

    logger.info("Booking status updated", {
      bookingId,
      newStatus: status,
      ownerId: _id,
      requestId: req.id,
    });

    res.json({ success: true, message: "Status Updated" });

  } catch (e) {
    logger.error("Change booking status failed", {
      message: e.message,
      requestId: req.id,
    });

    res.json({ success: false, message: e.message });
  }
};