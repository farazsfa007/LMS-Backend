import express from "express";
import {
  addBook,
  getAllBooks,
  updateBook,
  deleteBook,
  getLibraryStats,
  rateBook,
} from "../controllers/bookController.js";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";
import ArchivedBook from "../models/ArchivedBook.js";

const router = express.Router();

// Add a book (Admin only)
router.post(
  "/add-book",
  protect,
  isAdmin,
  upload.fields([
    { name: "coverImage", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  addBook
);

//  Get all books (User & Admin)
router.get("/get-book", protect, getAllBooks);

//  Update a book (Admin only)
router.put(
  "/update-book/:id",
  protect,
  isAdmin,
  upload.single("coverImage"),
  updateBook
);

// Delete a book (Admin only)
router.delete("/delete-book/:id", protect, isAdmin, deleteBook);

//  Dashboard statistics (User & Admin)
router.get("/dashboard-stats", protect, getLibraryStats);

// Rate a book (User)
router.post("/rate-book/:id", protect, rateBook);

//  Archived books (Admin only)
router.get("/archived-books", protect, isAdmin, async (req, res) => {
  try {
    const archived = await ArchivedBook.find()
      .populate("deletedBy", "fullName email")
      .sort({ deletedAt: -1 });

    res.status(200).json(archived);
  } catch (err) {
    console.error("Error fetching archived books:", err);
    res.status(500).json({ message: "Failed to load archived books" });
  }
});

export default router;
