import User from "../models/User.js";
import Car from "../models/Car.js";
import Booking from "../models/Booking.js";

// ✅ Import logger
import { logger } from "../middlewares/logging.js";

export const adminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCars = await Car.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });

    const revenue = await Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: null, total: { $sum: "$price" } } }
    ]);

    const activeRentals = await Booking.countDocuments({
      pickupDate: { $lte: new Date() },
      returnDate: { $gte: new Date() }
    });

    const totalRevenue = revenue[0]?.total || 0;

    // 🔥 Add logging
    logger.info("Admin dashboard data fetched", {
      adminId: req.user?._id,
      totalUsers,
      totalCars,
      totalBookings,
      pendingBookings,
      activeRentals,
      totalRevenue,
      requestId: req.id,
    });

    res.json({
      totalUsers,
      totalCars,
      totalBookings,
      pendingBookings,
      activeRentals,
      totalRevenue,
    });

  } catch (error) {
    logger.error("Admin dashboard error", {
      message: error.message,
      requestId: req.id,
    });

    res.status(500).json({ message: "Admin dashboard error" });
  }
};