# XRPL Test Wallet with WalletConnect v2

A simple test wallet implementation for the XRP Ledger (XRPL) that demonstrates WalletConnect v2 integration. This project shows how to create a basic wallet that can connect to dapps and handle transaction signing requests.

## 🚀 Features

- **Basic Wallet Management**: Create test wallets on XRPL Testnet with automatic funding
- **WalletConnect v2 Support**: Connect to dapps using WalletConnect v2 protocol
- **Transaction Signing**: Handle transaction signing requests from connected dapps
- **Simple Approval Interface**: Basic UI for approving/rejecting requests
- **REST API**: API endpoints for wallet operations and WalletConnect management
- **Learning Resource**: Documented code that might be helpful for understanding WalletConnect v2

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager
- **Git** (for cloning the repository)
- **WalletConnect Project ID** (get one at [cloud.walletconnect.com](https://cloud.walletconnect.com))

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
# Clone using HTTPS
git clone https://github.com/SFsourDoh/xrpl-walletconnect-wallet.git
cd xrpl-walletconnect-wallet

# Or clone using SSH (if you have SSH keys set up)
git clone git@github.com:SFsourDoh/xrpl-walletconnect-wallet.git
cd xrpl-walletconnect-wallet
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# WalletConnect Project ID (required)
WALLETCONNECT_PROJECT_ID=your_project_id_here

# Server port (optional, defaults to 3002)
PORT=3002
```

**Note**: You'll need a WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com) for WalletConnect v2 to work.

### 4. Start the Server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

### 5. Access the Application

Open your browser and navigate to `http://localhost:3002`

### 6. Development

To make changes and contribute:

```bash
# Create a new branch for your changes
git checkout -b feature/your-feature-name

# Make your changes, then commit
git add .
git commit -m "Add your feature description"

# Push to your fork
git push origin feature/your-feature-name
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `WALLETCONNECT_PROJECT_ID` | Your WalletConnect Project ID | Yes | - |
| `PORT` | Server port | No | 3002 |

### Network Configuration

The wallet supports both XRPL Testnet and Mainnet:

- **Testnet**: `xrpl:1` (default for development)
- **Mainnet**: `xrpl:0` (use with caution)

## 📖 Usage Guide

### Creating a Test Wallet

1. Click "Create New Wallet" in the web interface
2. The wallet will be automatically created and funded with 10 XRP from the testnet faucet
3. Your wallet address and seed will be displayed
4. The wallet information is saved locally for future use

### Connecting to a Dapp

1. Get a WalletConnect URI from the dapp you want to connect to
2. Select the appropriate network (testnet/mainnet)
3. Paste the URI into the "WalletConnect URI" field
4. Click "Connect WalletConnect"
5. Approve the connection request when prompted

### Handling Transaction Requests

1. When a dapp sends a transaction for signing, a request will appear in the UI
2. Review the transaction details (shown as raw JSON for transparency)
3. Click "Approve" to sign the transaction or "Reject" to decline
4. The signed transaction will be sent back to the dapp

## 🔌 API Reference

### Wallet Management

#### `POST /api/create-wallet`
Create a new test wallet with automatic funding.

**Response:**
```json
{
  "success": true,
  "wallet": {
    "address": "r...",
    "seed": "s...",
    "publicKey": "..."
  }
}
```

#### `GET /api/balance/:address`
Get the XRP balance for a wallet address.

**Response:**
```json
{
  "success": true,
  "balance": "10000000",
  "balanceInXRP": 10,
  "address": "r..."
}
```

#### `GET /api/wallet`
Get information about the currently loaded wallet.

### WalletConnect Management

#### `POST /api/walletconnect/connect`
Connect to a dapp via WalletConnect v2.

**Request Body:**
```json
{
  "uri": "wc:...",
  "network": "xrpl:1"
}
```

#### `GET /api/walletconnect/status`
Get current WalletConnect connection status.

#### `GET /api/walletconnect/pending-requests`
Get pending connection and transaction requests.

#### `POST /api/walletconnect/approve-connection`
Approve a pending connection request.

#### `POST /api/walletconnect/reject-connection`
Reject a pending connection request.

#### `POST /api/walletconnect/approve-transaction`
Approve and sign a pending transaction request.

#### `POST /api/walletconnect/reject-transaction`
Reject a pending transaction request.

## 🏗️ Project Structure

```
xrpl-walletconnect-wallet/
├── index.js              # Main server file
├── package.json          # Dependencies and scripts
├── public/
│   └── index.html        # Frontend interface
├── .env                  # Environment variables (create this)
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

### Frontend (public/index.html)
- Basic wallet management interface
- WalletConnect connection handling
- Simple request approval UI
- Polling for new requests

### Backend (index.js)
- XRPL wallet operations
- WalletConnect v2 session management
- REST API endpoints
- Request processing

### Main Components

1. **WalletConnect Client**: Handles dapp connections
2. **Transaction Signer**: Signs XRPL transactions
3. **Request Handler**: Processes dapp requests
4. **State Management**: Tracks pending requests

## 🔒 Security Notes

- **Testnet Only**: This is designed for XRPL testnet testing only
- **Local Storage**: Wallet info is stored locally in `wallet.json`
- **Development Use**: Not intended for production or mainnet use
- **Basic Security**: Wallet seeds are stored in plain text for simplicity

## 🐛 Troubleshooting

### Common Issues

1. **WalletConnect Connection Fails**
   - Verify your Project ID is correct
   - Check that the URI is valid and not expired
   - Ensure the dapp supports XRPL chains

2. **Transaction Signing Fails**
   - Verify the wallet has sufficient XRP for fees
   - Check that the transaction format is valid
   - Ensure the wallet is properly loaded

3. **Server Won't Start**
   - Check that all dependencies are installed
   - Verify the `.env` file is properly configured
   - Ensure the port is not already in use

### Debug Information

The application includes basic logging. Check the server console for information about:
- WalletConnect connections
- Transaction requests
- API calls
- Error messages

## 🤝 Contributing

This is a learning project. Feel free to:
- Fork and modify for your own use
- Report bugs or suggest improvements
- Contribute documentation or code changes

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Thanks

- [XRPL.js](https://xrpl.org/docs/xrpljs/) for XRPL integration
- [WalletConnect v2](https://docs.walletconnect.com/) for the connection protocol
- [XRPL Testnet Faucet](https://xrpl.org/xrp-testnet-faucet.html) for test funding 