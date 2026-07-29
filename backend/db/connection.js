import mongoose from "mongoose";

export const connection = () => {
    mongoose.set('strictQuery', true);

    const dbUri = process.env.NODE_ENV === 'test'
        ? process.env.DB_URL
        : process.env.DB_URL_ONLINE;

    mongoose.connect(dbUri)
        .then(() => {
            console.log(`Connected to MongoDB successfully (db: ${mongoose.connection.name})`);
        })
        .catch((err) => {
            console.log('Failed to Connect', err);
        });
}
