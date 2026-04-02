
import User from "../models/User.js";
import Car from "../models/Car.js";
import Booking from "../models/Booking.js";

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

    res.json({
      totalUsers,
      totalCars,
      totalBookings,
      pendingBookings,
      activeRentals,
      totalRevenue: revenue[0]?.total || 0
    });

  } catch (error) {
    res.status(500).json({ message: "Admin dashboard error" });
  }
};