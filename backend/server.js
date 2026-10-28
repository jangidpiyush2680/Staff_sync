require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/db');

const port = Number(process.env.PORT || 5000);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to a random value with at least 32 characters in backend/.env.');
  process.exit(1);
}

connectDatabase().then(() => {
  app.listen(port, () => console.log(`StaffSync API listening at http://localhost:${port}`));
}).catch((error) => {
  console.error(`Unable to start StaffSync: ${error.message}`);
  process.exit(1);
});
