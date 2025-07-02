require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); // Ensure .env is loaded relative to app root
const { sequelize } = require('../models'); // Adjust path if your models/index.js is elsewhere

async function findAndDropForeignKey() {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = 'Groups'; // The table we are interested in
  const columnName = 'leaderId'; // The column that likely has the foreign key

  try {
    console.log(`Inspecting foreign keys for table: ${tableName}`);

    // This query might vary slightly based on MySQL version or information_schema access
    // It tries to find constraints where `Groups` is the referencing table and `leaderId` is a column in that constraint
    const [results] = await sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = '${columnName}'
        AND REFERENCED_TABLE_NAME IS NOT NULL;
    `);
    // DATABASE() gets the current database name from the connection

    if (results.length > 0) {
      for (const row of results) {
        const constraintName = row.CONSTRAINT_NAME;
        // Check if it's the default named constraint or one we want to target
        // The error was "Can't DROP 'Groups_ibfk_1'", so if we find it, we drop it.
        // If we find others related to leaderId, we might want to drop them too if they are causing conflict.
        // This is where it gets risky without knowing the exact state.
        // For now, let's target the specific one if found, or any FK on leaderId if the specific one isn't named.

        console.log(`Found foreign key constraint: '${constraintName}' on column '${columnName}'. Attempting to drop it.`);
        try {
          await queryInterface.removeConstraint(tableName, constraintName);
          console.log(`Successfully dropped foreign key constraint: '${constraintName}' from table '${tableName}'.`);
        } catch (dropError) {
          // If it's the specific "Can't DROP" error for this constraint, it might mean it's already gone
          // or the name in INFORMATION_SCHEMA is different from what MySQL uses internally for DROP
          if (dropError.original && dropError.original.sqlMessage && dropError.original.sqlMessage.includes("Can't DROP") && dropError.original.sqlMessage.includes(constraintName)) {
             console.warn(`Could not drop constraint '${constraintName}', it might not exist with that exact identifier for DROP command, or already dropped. Error: ${dropError.original.sqlMessage}`);
          } else {
            console.error(`Error dropping foreign key constraint '${constraintName}':`, dropError.original ? dropError.original.sqlMessage : dropError.message);
          }
        }
      }
    } else {
      console.log(`No foreign key constraints found on column '${columnName}' in table '${tableName}' via INFORMATION_SCHEMA.`);
      console.log("This might mean the constraint causing issues has a different configuration or the issue lies elsewhere.");
    }

    // Attempt to drop the specific problematic key if the above didn't catch it by column name
    // This is a direct attempt based on the error message.
    const problematicConstraintName = 'Groups_ibfk_1';
    console.log(`Attempting to directly drop constraint '${problematicConstraintName}' if it exists...`);
    try {
        await queryInterface.removeConstraint(tableName, problematicConstraintName);
        console.log(`Successfully dropped foreign key constraint: '${problematicConstraintName}' from table '${tableName}'.`);
    } catch (directDropError) {
        if (directDropError.original && directDropError.original.sqlMessage && directDropError.original.sqlMessage.includes("Can't DROP") && directDropError.original.sqlMessage.includes(problematicConstraintName)) {
            console.warn(`Constraint '${problematicConstraintName}' could not be dropped. It might not exist or the name is incorrect for the DROP command. Error: ${directDropError.original.sqlMessage}`);
        } else {
            console.warn(`Could not directly drop constraint '${problematicConstraintName}'. This is okay if it didn't exist. Error:`, directDropError.original ? directDropError.original.sqlMessage : directDropError.message);
        }
    }


  } catch (error) {
    console.error('An error occurred during the script:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

findAndDropForeignKey();
