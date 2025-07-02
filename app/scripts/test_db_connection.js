require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../models');

async function testConnection() {
  try {
    console.log('Attempting to authenticate with the database...');
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    console.log('Attempting to execute a simple query (SELECT 1+1 AS result)...');
    const [results, metadata] = await sequelize.query("SELECT 1+1 AS result");
    console.log("Query result:", results);

  } catch (error) {
    console.error('Unable to connect to the database or query failed:', error);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log('Database connection closed.');
    }
  }
}

testConnection();
