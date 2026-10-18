const path = require('path');

let cachedApp = null;
let cachedConnect = null;

function getExpressApp() {
  if (!cachedApp) {
    let appModule;
    let dbModule;
    try {
      appModule = require(path.join(process.cwd(), 'server-dist', 'app'));
      dbModule = require(path.join(process.cwd(), 'server-dist', 'config', 'db'));
    } catch (e) {
      appModule = require('../server-dist/app');
      dbModule = require('../server-dist/config/db');
    }
    cachedApp = appModule.default || appModule;
    cachedConnect = dbModule.connectDatabase;
  }
  return { app: cachedApp, connectDatabase: cachedConnect };
}

module.exports = async (req, res) => {
  try {
    const { app, connectDatabase } = getExpressApp();
    if (connectDatabase) {
      await connectDatabase();
    }
    return app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Invocation Error]:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Serverless invocation failure', message: err.message }));
  }
};
