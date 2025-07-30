import mongoose from "mongoose";

const archivedBookSchema = new mongoose.Schema(
  {
    title: String,
    author: String,
    genre: String,
    isbn: String,
    price: Number,
    description: String,
    coverImage: String,
    pdfPath: String,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const ArchivedBook = mongoose.model("ArchivedBook", archivedBookSchema);
export default ArchivedBook;
