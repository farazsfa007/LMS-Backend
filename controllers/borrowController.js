import BorrowedBook from "../models/borrowedBookModel.js";
import Book from "../models/bookModel.js";
import path from "path";
import { calculateFine } from "../utils/calculateFine.js";

//  Borrow Book blocks if fine exists
export const borrowBook = async (req, res) => {
  const userId = req.userId;
  const bookId = req.params.bookId;

  try {
    // Block borrow if user has any unpaid fine
    const unpaidFineBorrow = await BorrowedBook.findOne({
      userId,
      isReturned: false,
      finePaid: false,
    });

    if (unpaidFineBorrow && calculateFine(unpaidFineBorrow.borrowDate) > 0) {
      return res.status(403).json({
        message:
          "You have unpaid fines. Please pay before borrowing new books.",
      });
    }

    // Block if already borrowed this book
    const alreadyBorrowed = await BorrowedBook.findOne({
      userId,
      bookId,
      isReturned: false,
    });
    if (alreadyBorrowed)
      return res.status(400).json({ message: "Book already borrowed" });

    const borrow = new BorrowedBook({ userId, bookId });
    await borrow.save();

    res.status(200).json({ message: "Book borrowed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Return Book
export const returnBook = async (req, res) => {
  const userId = req.userId || req.user._id;
  const bookId = req.params.bookId;
  const { rating } = req.body;

  try {
    const borrowRecord = await BorrowedBook.findOne({
      userId,
      bookId,
      isReturned: false,
    });

    if (!borrowRecord) {
      return res.status(400).json({ message: "No active borrow record found" });
    }

    //  Mark as returned
    borrowRecord.isReturned = true;
    borrowRecord.returnDate = new Date();
    await borrowRecord.save();

    let updatedBook = null;

    // If rating is present, update the book's ratings array
    if (rating && rating >= 1 && rating <= 5) {
      const book = await Book.findById(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });

      // Check if user already rated
      const existingRatingIndex = book.ratings.findIndex(
        (r) => r.user.toString() === userId.toString()
      );

   if (existingRatingIndex !== -1) {
  // Skip adding rating if user already rated before
  console.log("User already rated. Skipping rating update.");
} else {
  // Add new rating
  book.ratings.push({ user: userId, rating });
}


      // Recalculate average rating
      const total = book.ratings.reduce((sum, r) => sum + r.rating, 0);
      book.averageRating = total / book.ratings.length;

      await book.save();
      updatedBook = book;
    }

    return res.status(200).json({
      message: "Book returned successfully",
      updatedBook,
    });
  } catch (err) {
    console.error("Return Book Error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get All Borrowed Books by User (with userRating)
export const getUserBorrowedBooks = async (req, res) => {
  try {
    const userId = req.userId;

    const borrowedBooks = await BorrowedBook.find({ userId })
      .populate("bookId")
      .lean();

    const updatedBorrowed = borrowedBooks.map((borrow) => {
      const book = borrow.bookId;

      // Find user rating from the book's ratings array
      const userRatingEntry = book?.ratings?.find(
        (r) => r.user.toString() === userId.toString()
      );

      return {
        ...borrow,
        userRating: userRatingEntry?.rating || null,
      };
    });

    res.status(200).json(updatedBorrowed);
  } catch (err) {
    console.error("getUserBorrowedBooks error:", err);
    res.status(500).json({ message: err.message });
  }
};

// View Book PDF if Currently Borrowed
export const viewBookPDF = async (req, res) => {
  try {
    const userId = req.user._id;
    const bookId = req.params.bookId;

    const borrowEntry = await BorrowedBook.findOne({
      userId,
      bookId,
      isReturned: false,
    });

    if (!borrowEntry) {
      return res
        .status(403)
        .json({ message: "You have not currently borrowed this book." });
    }

    const book = await Book.findById(bookId);
    if (!book || !book.pdfPath) {
      return res.status(404).json({ message: "PDF not found for this book." });
    }

    const pdfFilePath = path.resolve(book.pdfPath);
    res.sendFile(pdfFilePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to serve PDF." });
  }
};

//  Get User Fines
export const getUserFines = async (req, res) => {
  try {
    const userId = req.userId;

    const pendingBorrows = await BorrowedBook.find({
      userId,
      isReturned: false,
      finePaid: false,
    }).populate("bookId");

    const fineDetails = pendingBorrows.map((borrow) => {
      const fine = calculateFine(borrow.borrowDate);
      return {
        borrowId: borrow._id,
        bookTitle: borrow.bookId.title,
        fine,
      };
    });

    const totalFine = fineDetails.reduce((acc, curr) => acc + curr.fine, 0);

    res.status(200).json({ totalFine, fines: fineDetails });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Pay Fine
export const payFine = async (req, res) => {
  try {
    const { borrowId } = req.params;

    const borrowRecord = await BorrowedBook.findById(borrowId);
    if (!borrowRecord)
      return res.status(404).json({ message: "Borrow record not found" });

    const fine = calculateFine(borrowRecord.borrowDate);

    if (fine <= 0) return res.status(400).json({ message: "No fine to pay" });

    borrowRecord.finePaid = true;
    await borrowRecord.save();

    res
      .status(200)
      .json({ message: `Fine of ₹${fine} paid successfully`, amount: fine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// all user fines
export const getAllUsersFines = async (req, res) => {
  try {
    const pendingBorrows = await BorrowedBook.find({
      isReturned: false,
      finePaid: false,
    })
      .populate({ path: "userId", select: "fullName username email" })
      .populate("bookId");

    const userFinesMap = new Map();

    for (const borrow of pendingBorrows) {
      if (!borrow.userId) continue; 

      const fine = calculateFine(borrow.borrowDate);
      if (fine <= 0) continue;

      const userId = borrow.userId._id.toString();
      const fullName = borrow.userId.fullName || "N/A";
      const username = borrow.userId.username || borrow.userId.email || "N/A";

      if (!userFinesMap.has(userId)) {
        userFinesMap.set(userId, { userId, fullName, username, totalFine: 0 });
      }

      userFinesMap.get(userId).totalFine += fine;
    }

    res.status(200).json(Array.from(userFinesMap.values()));
  } catch (err) {
    console.error("Error fetching all user fines:", err);
    res.status(500).json({ message: err.message });
  }
};



// Admin Dashboard Stats (Borrowed vs Returned)
export const getBorrowReturnStats = async (req, res) => {
  try {
    const totalBorrowed = await BorrowedBook.countDocuments(); // All borrow records
    const totalReturned = await BorrowedBook.countDocuments({ isReturned: true });

    res.status(200).json({
      totalBorrowed,
      totalReturned,
    });
  } catch (err) {
    console.error("Error fetching borrow/return stats:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};


// Get books not currently borrowed by the user
export const getAvailableBooks = async (req, res) => {
  try {
    const userId = req.userId;

    // Find all currently borrowed (and not returned) books by this user
    const borrowedBooks = await BorrowedBook.find({
      userId,
      isReturned: false,
    }).select("bookId");

    const borrowedBookIds = borrowedBooks.map((b) => b.bookId);

    // Fetch books not in that list
    const availableBooks = await Book.find({
      _id: { $nin: borrowedBookIds },
    });

    res.status(200).json(availableBooks);
  } catch (err) {
    console.error("Error fetching available books:", err);
    res.status(500).json({ message: err.message });
  }
};
