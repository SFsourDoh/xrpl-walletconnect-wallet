# XRPL Test Wallet - WalletConnect v2 Reference Implementation

A comprehensive reference implementation of a WalletConnect v2 wallet for the XRP Ledger (XRPL). This project demonstrates how to build a wallet that can connect to dapps and handle transaction signing requests using WalletConnect v2.

## 🚀 Features

- **Wallet Management**: Create and manage test wallets on XRPL Testnet with automatic funding
- **WalletConnect v2 Integration**: Connect to external dapps using WalletConnect v2 protocol
- **Transaction Signing**: Handle and approve transaction signing requests from connected dapps
- **User Approval Interface**: Clean UI for approving/rejecting connection and transaction requests
- **REST API**: Complete API for wallet operations and WalletConnect management
- **Reference Implementation**: Well-documented code that can be used as a starting point for other projects

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager
- **WalletConnect Project ID** (get one at [cloud.walletconnect.com](https://cloud.walletconnect.com))

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd wc_wallet
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

**Important**: You must get a WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com). This is required for WalletConnect v2 to work.

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

## 🏗️ Architecture

### Frontend (public/index.html)
- **Wallet Management UI**: Create wallets, view balances
- **WalletConnect Interface**: Connect to dapps, handle requests
- **Request Approval**: User interface for approving/rejecting requests
- **Real-time Polling**: Continuously checks for new requests

### Backend (index.js)
- **XRPL Integration**: Wallet creation, balance checking, transaction signing
- **WalletConnect v2 Server**: Session management, request handling
- **REST API**: Endpoints for all wallet and WalletConnect operations
- **Event Handling**: Processes WalletConnect events and requests

### Key Components

1. **WalletConnect Client**: Manages connections and sessions with dapps
2. **Transaction Signer**: Signs XRPL transactions using the current wallet
3. **Request Handler**: Processes incoming connection and transaction requests
4. **State Management**: Tracks pending requests and current wallet state

## 🔒 Security Considerations

- **Testnet Only**: This implementation is designed for testing on XRPL testnet
- **Local Storage**: Wallet information is stored locally in `wallet.json`
- **No Production Use**: Do not use this wallet for mainnet or production environments
- **Private Key Security**: The wallet seed is stored in plain text for development purposes

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

### Debug Mode

The application includes comprehensive logging. Check the server console for detailed information about:
- WalletConnect connection attempts
- Transaction signing requests
- API endpoint calls
- Error details

## 🤝 Contributing

This is a reference implementation. Feel free to:
- Fork and modify for your own projects
- Submit issues for bugs or improvements
- Contribute documentation or code improvements

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- [XRPL.js](https://xrpl.org/docs/xrpljs/) for XRPL integration
- [WalletConnect v2](https://docs.walletconnect.com/) for the connection protocol
- [XRPL Testnet Faucet](https://xrpl.org/xrp-testnet-faucet.html) for test funding 