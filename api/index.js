import connectDB from '../database/config/config.js';
import app from '../server.js';

export default async function handler(req, res) {
    // Ensure database is connected before handling the request
    await connectDB();

    // Forward request to Express app
    return app(req, res);
}
