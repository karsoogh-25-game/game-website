require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { sequelize } = require('../models');

async function findAndDropAnnouncementAttachmentForeignKey() {
  const queryInterface = sequelize.getQueryInterface();
  const tableName = 'AnnouncementAttachments';
  const columnName = 'announcementId'; // Correct based on model
  const referencedTableName = 'Announcements'; // Correct based on model

  try {
    console.log(`Inspecting foreign keys for table: ${tableName} on column: ${columnName} referencing ${referencedTableName}`);

    const [results] = await sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${tableName}'
        AND COLUMN_NAME = '${columnName}'
        AND REFERENCED_TABLE_NAME = '${referencedTableName}';
    `);

    if (results.length > 0) {
      for (const row of results) {
        const constraintName = row.CONSTRAINT_NAME;
        console.log(`Found foreign key constraint: '${constraintName}' on column '${columnName}' referencing '${referencedTableName}'. Attempting to drop it.`);
        try {
          await queryInterface.removeConstraint(tableName, constraintName);
          console.log(`Successfully dropped foreign key constraint: '${constraintName}' from table '${tableName}'.`);
        } catch (dropError) {
          if (dropError.original && dropError.original.sqlMessage && dropError.original.sqlMessage.includes("Can't DROP") && dropError.original.sqlMessage.includes(constraintName)) {
             console.warn(`Could not drop constraint '${constraintName}', it might not exist with that exact identifier for DROP command, or already dropped. Error: ${dropError.original.sqlMessage}`);
          } else {
            console.error(`Error dropping foreign key constraint '${constraintName}':`, dropError.original ? dropError.original.sqlMessage : dropError.message);
          }
        }
      }
    } else {
      console.log(`No foreign key constraints found on column '${columnName}' in table '${tableName}' referencing '${referencedTableName}' via INFORMATION_SCHEMA.`);
    }

    // Attempt to drop the specific problematic key mentioned in the error log, if it's different or the above missed it.
    const problematicConstraintName = 'AnnouncementAttachments_ibfk_1'; // From the error log
    console.log(`Attempting to directly drop constraint '${problematicConstraintName}' from '${tableName}' if it exists...`);
    try {
        await queryInterface.removeConstraint(tableName, problematicConstraintName);
        console.log(`Successfully dropped foreign key constraint: '${problematicConstraintName}' from table '${tableName}'.`);
    } catch (directDropError) {
        // Check if the error is specifically "Can't DROP" for this constraint, which might mean it doesn't exist by that name for dropping
        if (directDropError.original && directDropError.original.sqlMessage && directDropError.original.sqlMessage.includes("Can't DROP") && directDropError.original.sqlMessage.includes(problematicConstraintName)) {
            console.warn(`Constraint '${problematicConstraintName}' could not be dropped from '${tableName}'. It might not exist or the name is incorrect for the DROP command. Error: ${directDropError.original.sqlMessage}`);
        } else {
            // Log other errors, but don't make it fatal if it's just "doesn't exist"
            console.warn(`Could not directly drop constraint '${problematicConstraintName}' from '${tableName}'. This is okay if it didn't exist or was already dropped. Error:`, directDropError.original ? directDropError.original.sqlMessage : directDropError.message);
        }
    }

  } catch (error) {
    console.error('An error occurred during the script:', error);
  } finally {
    if (sequelize) {
        await sequelize.close();
        console.log('Database connection closed for AnnouncementAttachments script.');
    }
  }
}

findAndDropAnnouncementAttachmentForeignKey();
