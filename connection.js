import mongoose from "mongoose";
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Mongodb Connected Successfully.");
    }
    catch {
        console.log("Error While Connecting Database.")
    }
}

export default connectDB;