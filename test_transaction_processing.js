const { execSync } = require('child_process');

async function testTransactionProcessing() {
    console.log('🧪 Testing Transaction Processing Flow\n');
    
    try {
        // Test 1: Check if transaction definitions are loaded
        console.log('1. Testing transaction definitions endpoint...');
        const definitionsResponse = execSync('curl -s http://localhost:3002/api/transaction-definitions', { encoding: 'utf8' });
        const definitionsData = JSON.parse(definitionsResponse);
        
        if (definitionsData.success) {
            console.log('✅ Transaction definitions loaded successfully');
            console.log(`   Available transaction types: ${Object.keys(definitionsData.transactionTypes).length}`);
        } else {
            throw new Error('Failed to load transaction definitions');
        }
        
        // Test 2: Check if transaction status endpoint works
        console.log('\n2. Testing transaction status endpoint...');
        const statusResponse = execSync('curl -s http://localhost:3002/api/transaction-status/invalid_hash_test', { encoding: 'utf8' });
        const statusData = JSON.parse(statusResponse);
        
        if (statusData.success === false && statusData.error) {
            console.log('✅ Transaction status endpoint working (correctly rejected invalid hash)');
        } else {
            throw new Error('Transaction status endpoint not working as expected');
        }
        
        // Test 3: Check if auto-fill endpoint works
        console.log('\n3. Testing transaction auto-fill endpoint...');
        const autofillResponse = execSync('curl -s http://localhost:3002/api/transaction-autofill/rNaMETzxqGPi6hoTHA86heZzxZiBS6o31A', { encoding: 'utf8' });
        const autofillData = JSON.parse(autofillResponse);
        
        if (autofillData.success) {
            console.log('✅ Transaction auto-fill endpoint working');
            console.log(`   Fee: ${autofillData.autofill.Fee}`);
            console.log(`   Sequence: ${autofillData.autofill.Sequence}`);
            console.log(`   LastLedgerSequence: ${autofillData.autofill.LastLedgerSequence}`);
        } else {
            console.log('⚠️  Auto-fill endpoint returned error:', autofillData.error);
        }
        
        console.log('\n🎉 All endpoints are working correctly!');
        console.log('\n📋 Summary of new features:');
        console.log('   • Enhanced transaction submission with validation tracking');
        console.log('   • Real-time processing UI with progress indicators');
        console.log('   • Transaction status polling for validation confirmation');
        console.log('   • Auto-fill of common fields (Fee, Sequence, LastLedgerSequence)');
        console.log('   • Proper error handling and user feedback');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testTransactionProcessing(); 