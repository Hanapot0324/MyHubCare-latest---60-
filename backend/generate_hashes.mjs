import bcrypt from 'bcrypt';

const passwords = {
  'admin123': 'admin',
  'nurse123': 'nurse', 
  'doc123': 'physician',
  'lab123': 'lab_personnel',
  'case123': 'case_manager',
  'patient123': 'patient'
};

async function generateHashes() {
  console.log('Generating bcrypt hashes...\n');
  
  const hashes = {};
  
  for (const [password, role] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 10);
    hashes[role] = hash;
    console.log(`${role} (${password}): ${hash}`);
  }
  
  return hashes;
}

generateHashes().then(hashes => {
  console.log('\n=== COPY THESE HASHES TO SQL FILE ===\n');
  console.log('Admin:', hashes.admin);
  console.log('Physician:', hashes.physician);
  console.log('Nurse:', hashes.nurse);
  console.log('Lab Personnel:', hashes.lab_personnel);
  console.log('Case Manager:', hashes.case_manager);
  console.log('Patient:', hashes.patient);
}).catch(console.error);

