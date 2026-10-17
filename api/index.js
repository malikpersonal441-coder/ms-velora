const appModule = require('../backend/dist/app');
const app = appModule.default || appModule;
const { connectDatabase } = require('../backend/dist/config/db');

module.exports = async (req, res) => {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('[Vercel Serverless DB Error]:', err);
  }
  return app(req, res);
};
