import multer from "multer";
import path from "path";
import fs from "fs";

// decide folder based on file tpye
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "uploads/books";

    if (file.mimetype === "application/pdf") {
      folder = "uploads/pdfs";
    }

    const uploadPath = path.join(folder);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueSuffix);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP, and PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
});

export default upload;
