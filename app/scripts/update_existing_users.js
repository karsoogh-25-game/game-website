require('dotenv').config();
const { sequelize, User } = require('../models');
const { Op } = require('sequelize');

async function updateUsers() {
  console.log('Connecting to the database...');
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    console.log('Syncing database schema...');
    await sequelize.sync({ alter: true });
    console.log('Schema synced successfully.');
    console.log("Updating users with NULL gender to 'male'...");
    
    const [results, metadata] = await User.update(
      { gender: 'male' },
      {
        where: {
          gender: {
            [Op.is]: null
          }
        }
      }
    );

    if (results > 0) {
        console.log(`Update complete. ${results} users were updated successfully.`);
    } else {
        console.log('No users needed an update. All users already have a gender set.');
    }
    
  } catch (error) {
    console.error('Unable to connect to the database or update users:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

updateUsers();