import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import sendEmail from "../utils/sendEmail.js";
import Book from "../models/bookModel.js";
import BorrowedBook from "../models/borrowedBookModel.js";

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// REGISTER
export const register = async (req, res) => {
  try {
    const {
      fullName,
      phone,
      dob,
      city,
      username,
      email,
      password,
      confirmPassword,
    } = req.body;

    const nameRegex = /^[A-Za-z\s]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!nameRegex.test(fullName)) {
      return res
        .status(400)
        .json({ msg: "Full name must contain only letters and spaces." });
    }

    if (!phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ msg: "Phone number must be exactly 10 digits." });
    }

    if (!dob || isNaN(Date.parse(dob))) {
      return res.status(400).json({ msg: "Invalid date of birth." });
    }

    if (!username || username.length < 3) {
      return res
        .status(400)
        .json({ msg: "Username must be at least 3 characters long." });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({ msg: "Invalid email address." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password must be at least 6 characters long." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ msg: "Passwords don't match." });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ msg: "User with this email or username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const profilePic = req.file ? req.file.filename : "";

    const user = await User.create({
      fullName,
      phone,
      dob,
      city,
      username,
      email,
      password: hashedPassword,
      role: "user",
      profilePic,
    });

    res.status(201).json({ msg: "Registered Successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) return res.status(404).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const token = generateToken(user._id, user.role);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Google Login
export const googleLogin = async (req, res) => {
  try {
    const { email, displayName, profilePic } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        username: email.split("@")[0],
        fullName: displayName,
        password: "",
        role: "user",
        profilePic,
      });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
      },
    });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Send OTP
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "Email not found" });

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.create({ email, otp: otpCode });
    await sendEmail(email, "OTP for Password Reset", `Your OTP is: ${otpCode}`);

    res.json({ msg: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord)
      return res.status(400).json({ msg: "Invalid or expired OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email }, { password: hashedPassword });
    await Otp.deleteMany({ email });

    res.json({ msg: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// Admin Dashboard Stats
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalBooks = await Book.countDocuments();

    const borrowedBooks = await BorrowedBook.countDocuments({
      isReturned: false,
    });
    const returnedBooks = await BorrowedBook.countDocuments({
      isReturned: true,
    });

    res.status(200).json({
      totalUsers,
      totalAdmins,
      totalBooks,
      borrowedBooks,
      returnedBooks,
    });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

//  promote user to admin
export const promoteUserToAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.role = "admin";
    await user.save();

    res.json({ msg: `${user.username} has been promoted to admin.` });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// demote admin to user
export const demoteAdminToUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role !== "admin") {
      return res.status(400).json({ msg: "User is not an admin." });
    }

    user.role = "user";
    await user.save();

    res.json({ msg: `${user.username} has been demoted to user.` });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};


// Get Member History
export const getMemberHistory = async (req, res) => {
  try {
    const users = await User.find(); 

    const memberHistory = await Promise.all(
      users.map(async (user) => {
        const borrowed = await BorrowedBook.find({ userId: user._id });
        const returned = borrowed.filter((b) => b.isReturned).length;
        const notReturned = borrowed.filter((b) => !b.isReturned).length;

        return {
          name: user.fullName,
          email: user.email,
          totalBorrowed: borrowed.length,
          returned,
          notReturned,
        };
      })
    );

    res.status(200).json(memberHistory);
  } catch (error) {
    res.status(500).json({ msg: "Failed to fetch member history", error: error.message });
  }
};

