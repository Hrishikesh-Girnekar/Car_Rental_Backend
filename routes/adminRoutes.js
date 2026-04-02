import express from "express";
import protect from "../middlewares/auth.js";
import isAdmin from "../middlewares/admin.js";
import { adminDashboard } from "../controllers/adminController.js";


const adminRouter = express.Router();

adminRouter.get(
  "/dashboard",
  protect,
  isAdmin,
  adminDashboard
);

export default adminRouter;