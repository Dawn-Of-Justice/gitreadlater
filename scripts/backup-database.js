const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const backupDir = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)){
  fs.mkdirSync(backupDir, { recursive: true });
}

async function backupDatabase() {
  try {
    console.log('Starting database backup');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Tables to backup
    const tables = [
      'user_subscriptions',
      'saved_repositories',
      'repositories',
      'premium_notifications',
      'paddle_events_billing',
      'health_check'
    ];
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    
    const backup = {};
    
    // Backup each table
    for (const table of tables) {
      console.log(`Backing up ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('*');
        
      if (error) {
        console.error(`Error backing up ${table}:`, error);
      } else {
        backup[table] = data;
        console.log(`Backed up ${data.length} rows from ${table}`);
      }
    }
    
    // Write backup to file
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`Backup complete: ${backupFile}`);
  } catch (error) {
    console.error('Backup failed:', error);
  }
}

backupDatabase();