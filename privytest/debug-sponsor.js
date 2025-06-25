import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { requestSuiFromFaucetV0, getFaucetHost } from '@mysten/sui/faucet';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize Sui client for testnet
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

async function debugSponsor() {
  console.log('🔍 Debugging Sponsor Account Setup\n');

  // Check if environment variables are set (removing VITE_ prefix for Node.js)
  const privateKey = process.env.VITE_SPONSOR_PRIVATE_KEY;
  const mnemonic = process.env.VITE_SPONSOR_MNEMONIC;
  
  console.log('Environment Variables:');
  console.log('VITE_SPONSOR_PRIVATE_KEY:', privateKey ? `✅ Set (${privateKey.substring(0, 15)}...)` : '❌ Not set');
  console.log('VITE_SPONSOR_MNEMONIC:', mnemonic ? `✅ Set (${mnemonic.split(' ').length} words)` : '❌ Not set');
  console.log('');

  if (!privateKey && !mnemonic) {
    console.log('❌ No sponsor credentials found in environment variables');
    console.log('Please set VITE_SPONSOR_PRIVATE_KEY or VITE_SPONSOR_MNEMONIC in your .env file\n');
    
    console.log('Example .env file:');
    console.log('VITE_SPONSOR_PRIVATE_KEY="suiprivkey1qg..."');
    console.log('# OR');
    console.log('VITE_SPONSOR_MNEMONIC="your twelve word mnemonic phrase here"');
    
    console.log('\n💡 Make sure your .env file is in the project root and has the correct format!');
    return;
  }

  try {
    // Create keypair
    let sponsorKeypair;
    if (privateKey) {
      console.log('📁 Using private key from environment');
      sponsorKeypair = Ed25519Keypair.fromSecretKey(privateKey);
    } else {
      console.log('📁 Using mnemonic from environment');
      sponsorKeypair = Ed25519Keypair.deriveKeypair(mnemonic);
    }

    const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
    console.log('✅ Sponsor Address:', sponsorAddress);
    console.log('');

    // Check balance
    console.log('💰 Checking sponsor balance...');
    const { data: coins } = await suiClient.getCoins({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI',
    });

    const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    
    console.log(`Total Balance: ${totalBalance.toString()} MIST`);
    console.log(`Number of coins: ${coins.length}`);
    console.log(`Balance in SUI: ${Number(totalBalance) / 1000000000} SUI`);
    
    if (coins.length === 0) {
      console.log('❌ No SUI coins found! This is why gasless transactions are failing.');
      console.log('');
      console.log('🚀 Requesting SUI from testnet faucet...');
      
      try {
        const faucetHost = getFaucetHost('testnet');
        await requestSuiFromFaucetV0({
          host: faucetHost,
          recipient: sponsorAddress,
        });
        
        console.log('✅ Faucet request sent! Wait a few seconds and run this script again.');
        console.log('💡 You can also check your balance at: https://testnet.suivision.xyz/account/' + sponsorAddress);
      } catch (faucetError) {
        console.error('❌ Faucet request failed:', faucetError.message);
        console.log('');
        console.log('💡 You can manually request SUI from: https://discord.com/channels/916379725201563759/971488439931392130');
        console.log(`Send this address: ${sponsorAddress}`);
      }
    } else {
      console.log('✅ Sponsor has sufficient balance for gas payments!');
      console.log('🎉 Gasless transactions should now work!');
      
      // Show coin details
      console.log('\n📋 Coin Details:');
      coins.slice(0, 5).forEach((coin, i) => {
        console.log(`  Coin ${i + 1}: ${coin.balance} MIST (ID: ${coin.coinObjectId})`);
      });
      if (coins.length > 5) {
        console.log(`  ... and ${coins.length - 5} more coins`);
      }
      
      console.log('\n🚀 Now you can use gasless transactions in your dApp!');
    }

  } catch (error) {
    console.error('❌ Error setting up sponsor:', error.message);
    console.log('');
    
    if (error.message.includes('Invalid')) {
      console.log('💡 Possible issues:');
      console.log('- Private key format is incorrect (should start with "suiprivkey1")');
      console.log('- Mnemonic phrase is invalid or has wrong number of words (should be 12 or 24 words)');
      console.log('- Make sure you have the correct credentials from your wallet');
      console.log('- Remove any quotes or extra spaces from your credentials');
    }
  }
}

// Run the debug
debugSponsor().catch(console.error); 