import Book from "../models/bookModel.js";
import path from "path";
import fs from "fs";
import BorrowedBook from "../models/borrowedBookModel.js";
import ArchivedBook from "../models/ArchivedBook.js";

// Admin can add a book with cover image
export const addBook = async (req, res) => {
  try {
    const { title, author, isbn, genre, rating, description, price } = req.body;

    if (!isbn) return res.status(400).json({ message: "ISBN is required" });
    const isbnRegex = /^(97(8|9))?\d{9}(\d|X)$/;
    if (!isbnRegex.test(isbn))
      return res.status(400).json({ message: "Invalid ISBN format" });
    if (!title || !author || price === undefined) {
      return res
        .status(400)
        .json({ message: "Title, author, ISBN, and price are required" });
    }

    const existingBook = await Book.findOne({ isbn });
    if (existingBook)
      return res
        .status(400)
        .json({ message: "Book with this ISBN already exists" });

    let coverImagePath = "";
    let pdfPath = "";
    if (req.files?.coverImage) {
      coverImagePath = path.join(
        "uploads",
        "books",
        req.files.coverImage[0].filename
      );
    }
    if (req.files?.pdf) {
      pdfPath = path.join("uploads", "pdfs", req.files.pdf[0].filename);
    }

    const book = await Book.create({
      title,
      author,
      isbn,
      genre,
      rating,
      description,
      price,
      coverImage: coverImagePath,
      pdfPath,
      addedBy: req.user._id,
    });

    res.status(201).json(book);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get all books
export const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE book
export const updateBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const updatedData = req.body;

    const oldBook = await Book.findById(bookId);

    if (req.file) {
      if (oldBook && oldBook.coverImage) {
        const imagePath = path.join(process.cwd(), oldBook.coverImage);
        fs.unlink(imagePath, (err) => {
          if (err) console.log("Old image delete error:", err);
        });
      }
      updatedData.coverImage = path.join("uploads", "books", req.file.filename);
    }

    const updatedBook = await Book.findByIdAndUpdate(bookId, updatedData, {
      new: true,
    });

    if (!updatedBook) {
      return res.status(404).json({ message: "Book not found" });
    }

    res.status(200).json(updatedBook);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update book" });
  }
};

// DELETE book

export const deleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Archive book before deletion
    const archivedBook = new ArchivedBook({
      title: book.title,
      author: book.author,
      genre: book.genre,
      isbn: book.isbn,
      price: book.price,
      description: book.description,
      coverImage: book.coverImage,
      pdfPath: book.pdfPath,
      deletedBy: req.user._id,
    });

    await archivedBook.save(); // Save to archive
    await Book.findByIdAndDelete(bookId); // Remove original

    // Delete files from filesystem
    const deleteFileIfExists = async (relativePath) => {
      if (!relativePath) return;
      const fullPath = path.resolve(process.cwd(), relativePath);
      if (fs.existsSync(fullPath)) {
        try {
          await fs.promises.unlink(fullPath);
        } catch (error) {
          console.error(`Failed to delete file ${relativePath}:`, error);
        }
      }
    };

    await deleteFileIfExists(book.coverImage);
    await deleteFileIfExists(book.pdfPath);

    res.status(200).json({ message: "Book deleted and archived successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete book" });
  }
};

//  CONTROLLER for user dashboard stats

export const getLibraryStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalBooks = await Book.countDocuments();
    const userBorrowedBooks = await BorrowedBook.find({ userId });

    const borrowedCount = userBorrowedBooks.length;
    const notReturnedCount = userBorrowedBooks.filter(
      (b) => !b.isReturned
    ).length;

    res.status(200).json({
      totalBooks,
      borrowedCount,
      notReturnedCount,
    });
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: "Failed to fetch library stats" });
  }
};

// Rate a Book
export const rateBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const { rating } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Invalid rating. Must be between 1 and 5." });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    // Check if user has already rated
    const existingRatingIndex = book.ratings.findIndex(
      (r) => r.user.toString() === userId.toString()
    );

   if (existingRatingIndex !== -1) {
  return res.status(400).json({ message: "You have already rated this book." });
}

// Add new rating
book.ratings.push({ user: userId, rating });


    // Recalculate average
    const total = book.ratings.reduce((sum, r) => sum + r.rating, 0);
    book.averageRating = total / book.ratings.length;

    await book.save();

    res.status(200).json({
      message: "Rating submitted successfully",
      updatedBook: book,
    });
  } catch (error) {
    console.error("Rate Book Error:", error);
    res.status(500).json({ message: "Failed to rate book" });
  }
};
