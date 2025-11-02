#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const backupPath = path.join(__dirname, '..', '.env.local.backup');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  process.exit(1);
}

// Read current env file
const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

// Create backup
fs.writeFileSync(backupPath, envContent);
console.log(`✅ Created backup at ${backupPath}`);

// Process lines
const newLines = [];
const migrations = [];

for (const line of lines) {
  if (line.startsWith('NEXT_PUBLIC_STATUSPAGE_API_KEY=')) {
    const value = line.replace('NEXT_PUBLIC_STATUSPAGE_API_KEY=', '');
    newLines.push(`STATUSPAGE_API_KEY=${value}`);
    migrations.push('  - NEXT_PUBLIC_STATUSPAGE_API_KEY → STATUSPAGE_API_KEY');
  } else if (line.startsWith('NEXT_PUBLIC_STATUSPAGE_PAGE_ID=')) {
    const value = line.replace('NEXT_PUBLIC_STATUSPAGE_PAGE_ID=', '');
    newLines.push(`STATUSPAGE_PAGE_ID=${value}`);
    migrations.push('  - NEXT_PUBLIC_STATUSPAGE_PAGE_ID → STATUSPAGE_PAGE_ID');
  } else if (line.startsWith('NEXT_PUBLIC_BACKUP_PASSWORD=')) {
    const value = line.replace('NEXT_PUBLIC_BACKUP_PASSWORD=', '');
    newLines.push(`BACKUP_PASSWORD=${value}`);
    migrations.push('  - NEXT_PUBLIC_BACKUP_PASSWORD → BACKUP_PASSWORD');
  } else {
    // Keep other lines as-is (including AI_GATEWAY_API_KEY)
    newLines.push(line);
  }
}

// Write new env file
fs.writeFileSync(envPath, newLines.join('\n'));

console.log('\n🔐 Security Migration Complete!\n');
console.log('Migrated variables:');
migrations.forEach(m => console.log(m));
console.log('\n⚠️  IMPORTANT: Restart your Next.js server for changes to take effect');
console.log('  Run: npm run dev\n');