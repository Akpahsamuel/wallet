# Privy Test dApp with Gasless Transactions

A React TypeScript dApp on Sui blockchain featuring **gasless transactions** (sponsored transactions) where users can interact with smart contracts without paying gas fees.

## 🚀 Features

- **Counter Smart Contract** - Increment/decrement operations on Sui
- **Gasless Transactions** - Sponsor pays gas fees instead of users
- **Wallet Integration** - Connect with Sui wallets via @mysten/dapp-kit
- **Environment-based Configuration** - Secure sponsor management
- **Debug Tools** - Built-in sponsor account diagnostics

## 🏗️ Architecture

### Gasless Transaction Flow

```
User → Creates Transaction → Signs with Wallet
                             ↓
Sponsor Account → Pays Gas → Signs Transaction
                             ↓
Sui Network ← Executes ← Dual-Signature Transaction
```

The implementation follows Sui's sponsored transaction pattern:
1. **User** initiates and signs the transaction
2. **Sponsor** provides gas payment and signs as gas owner
3. **Both signatures** are submitted together for execution

## 📋 Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A Sui wallet (Sui Wallet extension, etc.)
- Sui testnet account with SUI tokens

## 🛠️ Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd privytest
pnpm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

3. **Configure sponsor account** (see Configuration section below)

4. **Start development server:**
```bash
pnpm dev
```

## ⚙️ Configuration

### Sponsor Account Setup

For gasless transactions to work, you need a **sponsor account** that pays gas fees. Configure this in your `.env` file:

#### Option 1: Using Private Key
```bash
# .env
VITE_SPONSOR_PRIVATE_KEY="suiprivkey1qg..." # Your sponsor's private key
```

#### Option 2: Using Mnemonic
```bash
# .env
VITE_SPONSOR_MNEMONIC="word1 word2 word3 ... word12" # Your sponsor's seed phrase
```

### Getting a Sponsor Account

1. **Create new account:**
   ```bash
   pnpm debug-sponsor  # Will generate a demo account if none configured
   ```

2. **Fund with testnet SUI:**
   - Visit [Sui Discord Faucet](https://discord.com/channels/916379725201563759/971488439931392130)
   - Request SUI for your sponsor address
   - Or use the built-in faucet request in debug script

3. **Verify setup:**
   ```bash
   pnpm debug-sponsor  # Check balance and configuration
   ```

### Security Best Practices

- **Never commit `.env` files** (already in .gitignore)
- **Use separate accounts** for sponsor vs personal funds
- **Monitor sponsor balance** regularly
- **In production:** Use server-side sponsor management
- **Limit sponsor funds** to minimize exposure

## 🎮 Usage

### Basic Counter Operations

1. **Connect your Sui wallet** using the connect button
2. **Toggle gasless mode** using the switch in the UI
3. **Create counters** or **increment/decrement** existing ones

### Gasless vs Regular Transactions

| Mode | Gas Paid By | User Experience |
|------|-------------|-----------------|
| **Gasless** | Sponsor Account | No gas fees, instant transactions |
| **Regular** | Connected Wallet | User pays gas, standard flow |

### Code Examples

#### Using the Gasless Hook

```typescript
import { useGaslessSignAndExecuteTransaction } from './useGaslessSignAndExecute';

function MyComponent() {
  const { mutateAsync: executeTransaction } = useGaslessSignAndExecuteTransaction();
  
  const handleGaslessAction = async () => {
    const tx = new Transaction();
    // ... add your transaction logic
    
    const result = await executeTransaction({
      transaction: tx,
      useGasless: true, // Enable gasless mode
    });
    
    console.log('Transaction completed:', result.digest);
  };
}
```

#### Smart Auto-fallback Hook

```typescript
import { useSmartSignAndExecuteTransaction } from './useGaslessSignAndExecute';

function SmartComponent() {
  const { mutateAsync: executeTransaction } = useSmartSignAndExecuteTransaction();
  
  const handleSmartAction = async () => {
    const tx = new Transaction();
    // ... add your transaction logic
    
    // Tries gasless first, falls back to regular if needed
    const result = await executeTransaction({
      transaction: tx,
      preferGasless: true,
    });
  };
}
```

## 🏗️ Project Structure

```
src/
├── components/
│   ├── Counter.tsx              # Counter display with gasless toggle
│   ├── CreateCounter.tsx        # Counter creation with gasless option
│   └── SponsorConfig.tsx        # Sponsor configuration UI
├── hooks/
│   └── useGaslessSignAndExecute.tsx  # Gasless transaction hooks
├── providers/
│   └── GaslessTransactionProvider.tsx # Gasless transaction context
├── utils/
│   └── sponsorUtils.ts          # Sponsor account management
└── main.tsx                     # App entry with providers
```

## 🧪 Development & Testing

### Debug Commands

```bash
# Check sponsor account status
pnpm debug-sponsor

# Start development server
pnpm dev

# Build for production
pnpm build
```

### Testing Gasless Transactions

1. **Ensure sponsor has funds:**
   ```bash
   pnpm debug-sponsor
   ```

2. **Connect wallet and toggle gasless mode**

3. **Perform counter operations** - they should execute without wallet gas prompts

4. **Check transaction explorer** to verify sponsor paid gas fees

## 🔧 Troubleshooting

### Common Issues

**"Invalid user signature: Expect 2 signer signatures but got 1"**
- ✅ Fixed in current implementation
- Requires both user and sponsor signatures

**"Sponsor has no SUI coins for gas payment"**
```bash
pnpm debug-sponsor  # Check and fund sponsor account
```

**"Invalid checksum" in debug script**
```bash
# Check private key format in .env
VITE_SPONSOR_PRIVATE_KEY="suiprivkey1qg..."  # Must start with suiprivkey1
```

**Environment variables not loading**
```bash
# Ensure .env file is in project root
# Restart dev server after .env changes
pnpm dev
```

### Debug Script Output

The `debug-sponsor.js` script provides comprehensive diagnostics:

```bash
🔍 Debugging Sponsor Account Setup

Environment Variables:
VITE_SPONSOR_PRIVATE_KEY: ✅ Set (suiprivkey1qrq0...)
VITE_SPONSOR_MNEMONIC: ❌ Not set

📁 Using private key from environment
✅ Sponsor Address: 0x12850f4fd560e50f0b6d51571ac24a0b0470f326f130961cc84884c4e8aa379a

💰 Checking sponsor balance...
Total Balance: 1000000000 MIST
Number of coins: 1
Balance in SUI: 1 SUI
✅ Sponsor has sufficient balance for gas payments!
🎉 Gasless transactions should now work!
```

## 📚 Technical Implementation

### Sponsored Transaction Flow

The implementation follows [Sui's sponsored transaction documentation](https://sdk.mystenlabs.com/typescript/transaction-building/sponsored-transactions):

```typescript
// 1. Build transaction kind only
const kindBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

// 2. Create sponsored transaction
const sponsoredTx = Transaction.fromKind(kindBytes);
sponsoredTx.setSender(userAddress);      // User initiates
sponsoredTx.setGasOwner(sponsorAddress); // Sponsor pays
sponsoredTx.setGasPayment(sponsorCoins); // Sponsor's coins

// 3. Collect dual signatures
const userSignature = await wallet.signTransaction(txBytes);
const sponsorSignature = await sponsorKeypair.signTransaction(txBytes);

// 4. Execute with both signatures
await suiClient.executeTransactionBlock({
  transactionBlock: txBytes,
  signature: [userSignature.signature, sponsorSignature.signature]
});
```

### Key Components

- **GaslessTransactionProvider**: React context managing sponsor state
- **useGaslessSignAndExecute**: Hook for executing gasless transactions
- **sponsorUtils**: Utilities for sponsor account management
- **SponsorConfig**: UI for sponsor configuration

## 🔐 Security Considerations

### Development vs Production

**Development (Current Setup):**
- Environment variables in `.env`
- Client-side sponsor key management
- Suitable for testing and demos

**Production Recommendations:**
- Server-side sponsor management
- API endpoints for transaction sponsoring
- Hardware security modules (HSM)
- Multi-signature sponsor accounts
- Rate limiting and abuse prevention

### Risk Mitigation

1. **Limit sponsor funds** - Only keep necessary amounts
2. **Monitor transactions** - Track sponsor usage
3. **Implement quotas** - Prevent abuse
4. **Rotate keys regularly** - Update sponsor accounts
5. **Use testnet first** - Verify implementation

## 📖 References

- [Sui TypeScript SDK](https://sdk.mystenlabs.com/typescript)
- [Sponsored Transactions](https://sdk.mystenlabs.com/typescript/transaction-building/sponsored-transactions)
- [dApp Kit Documentation](https://sdk.mystenlabs.com/dapp-kit)
- [Sui Testnet Faucet](https://discord.com/channels/916379725201563759/971488439931392130)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test with the debug script
4. Submit a pull request

---

**Happy building with gasless transactions! 🚀**
