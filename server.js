import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import connectDB from './configs/db.js';
import userRouter from './routes/userRoutes.js';
import ownerRouter from './routes/ownerRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js'
import {
  morganLogger,
  requestLogger,
  errorLogger,
  requestIdMiddleware,
  setupCrashHandlers,
} from "./middlewares/logging.js";


setupCrashHandlers();
// Initialize express app
const app = express();

// Connect Database
await connectDB()


// Middlewares
app.use(cors());
app.use(requestIdMiddleware);   // 🔥 FIRST
app.use(morganLogger);          // HTTP logs
app.use(express.json());        // body parser
app.use(requestLogger);         // custom logger
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => res.send("Server is running..."));
app.use('/api/user', userRouter);
app.use('/api/owner', ownerRouter);
app.use('/api/booking', bookingRouter);
app.use("/api/admin", adminRouter);

app.use(errorLogger);

app.use((err, req, res, next) => {
  res.status(500).json({ message: "Internal Server Error" });
});


const PORT = process.env.PORT || 3005;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})