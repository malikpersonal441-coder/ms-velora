const appModule = require('../server-dist/app');
const app = appModule.default || appModule;
const { connectDatabase } = require('../server-dist/config/db');

module.exports = async (req, res) => {
  try {
    await connectDatabase();
  } catch (err) {
    console.error('[Vercel Serverless DB Error]:', err);
  }
  return app(req, res);
};
