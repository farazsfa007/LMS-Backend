import express from "express";
import {
  borrowBook,
  returnBook,
  getUserBorrowedBooks,
  viewBookPDF,
  getUserFines,
  payFine,
  getAllUsersFines,
  getBorrowReturnStats,
  getAvailableBooks,
} from "../controllers/borrowController.js";

import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/borrow/:bookId", verifyToken, borrowBook);
router.post("/return/:bookId", verifyToken, returnBook);
router.get("/borrowed", verifyToken, getUserBorrowedBooks);
router.get("/pdf/:bookId", verifyToken, viewBookPDF);

// fine routes
router.get("/fines", verifyToken, getUserFines);
router.post("/pay-fine/:borrowId", verifyToken, payFine);

// Only accessible by admin
router.get("/all-fines", verifyToken, getAllUsersFines);

// admin stats for borrowed vs returned
router.get("/admin/borrow-return-stats", verifyToken, getBorrowReturnStats);

router.get("/available-books", verifyToken, getAvailableBooks); // new

export default router;
