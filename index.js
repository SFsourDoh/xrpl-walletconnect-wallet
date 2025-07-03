// ============================================================================
// XRPL Test Wallet - Server Implementation
// ============================================================================
// This is a reference implementation of a WalletConnect v2 wallet server for XRPL
// It demonstrates how to:
// 1. Create and manage XRPL test wallets with automatic funding
// 2. Handle WalletConnect v2 connections and session management
// 3. Process transaction signing requests from dapps
// 4. Provide a REST API for wallet operations
// ============================================================================

const express = require('express');
const cors = require('cors');
const xrpl = require('xrpl');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================================
// Global Configuration and State
// ============================================================================

// XRPL Client (Testnet)
const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');

// WalletConnect v2 configuration and state
let walletConnectClient = null; // WalletConnect SignClient instance
let walletConnectModal = null; // WalletConnect Modal instance
let currentWalletAddress = null; // Current wallet address for WalletConnect operations
let currentWalletSeed = null; // Current wallet seed for transaction signing
let currentNetwork = 'testnet'; // Current network selection (testnet/mainnet)

// Wallet state management
let wallet = null; // Current wallet object
let walletConnectSession = null; // Active WalletConnect session

// ============================================================================
// Transaction Signing Functions
// ============================================================================

/**
 * Handle transaction signing requests from dapps via WalletConnect
 * This function processes incoming transaction requests, signs them with the current wallet,
 * and sends the signed transaction back to the requesting dapp
 * @param {object} request - The WalletConnect transaction request
 * @returns {object} The signed transaction
 */
async function handleTransactionSigning(request) {
  try {
    console.log('=== HANDLING TRANSACTION SIGNING REQUEST ===');
    console.log('Request ID:', request.id);
    console.log('Request topic:', request.topic);
    
    const transaction = request.params.request.params.tx_json;
    console.log('Incoming transaction from dapp:', JSON.stringify(transaction, null, 2));
    
    // Validate that we have a wallet to sign with
    if (!currentWalletSeed) {
      console.error('No wallet available for signing');
      throw new Error('No wallet available for signing');
    }
    
    console.log('Using wallet seed for signing:', currentWalletSeed.substring(0, 10) + '...');
    
    // For now, auto-approve and sign the transaction
    // In a real wallet, you'd show this to the user for approval
    console.log('Auto-approving transaction signing...');
    
    // Sign the transaction using XRPL.js
    const walletInstance = xrpl.Wallet.fromSeed(currentWalletSeed);
    console.log('Wallet instance created from seed');
    
    // Prepare the transaction for signing (add missing fields if needed)
    const txToSign = {
      ...transaction,
      Fee: transaction.Fee || '12',
      Sequence: transaction.Sequence || await getAccountSequence(walletInstance.address)
    };
    
    console.log('Transaction prepared for signing:', JSON.stringify(txToSign, null, 2));
    
    // Auto-fill missing fields
    const preparedTx = await client.autofill(txToSign);
    console.log('Transaction auto-filled:', JSON.stringify(preparedTx, null, 2));
    
    const signedTx = walletInstance.sign(preparedTx);
    
    console.log('Transaction signed successfully:', signedTx);
    
    // Respond to the WalletConnect request with the signed transaction
    try {
      // For WalletConnect v2, we need to use the session to respond
      const sessions = walletConnectClient.session.getAll();
      if (sessions.length > 0) {
        const session = sessions[0];
        await walletConnectClient.respond({
          topic: session.topic,
          response: {
            id: request.id,
            jsonrpc: '2.0',
            result: {
              signedTransaction: signedTx
            }
          }
        });
      }
      console.log('Signed transaction sent back to dapp successfully');
      return signedTx;
    } catch (responseError) {
      console.error('Error responding to dapp:', responseError);
      throw responseError;
    }
    
  } catch (error) {
    console.error('Error handling transaction signing:', error);
    
    // Send error response to dapp
    try {
      const sessions = walletConnectClient.session.getAll();
      if (sessions.length > 0) {
        const session = sessions[0];
        await walletConnectClient.respond({
          topic: session.topic,
          response: {
            id: request.id,
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: error.message
            }
          }
        });
      }
      console.log('Error response sent back to dapp');
    } catch (responseError) {
      console.error('Error sending error response to dapp:', responseError);
    }
    throw error;
  }
}

// ============================================================================
// Initialization Functions
// ============================================================================

/**
 * Initialize connection to XRPL testnet
 * Establishes WebSocket connection to the XRPL testnet for wallet operations
 */
async function initializeXRPL() {
  try {
    await client.connect();
    console.log('Connected to XRPL Testnet');
  } catch (error) {
    console.error('Failed to connect to XRPL:', error);
  }
}

// Helper: Wait for account to appear in the ledger
async function waitForAccount(client, address, maxTries = 15, delayMs = 2000) {
  console.log(`Waiting for account ${address} to appear in ledger...`);
  for (let i = 0; i < maxTries; i++) {
    console.log(`Attempt ${i + 1}/${maxTries} to find account...`);
    try {
      const info = await client.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated'
      });
      console.log(`Account found on attempt ${i + 1}!`);
      return info.result.account_data;
    } catch (e) {
      if (e.data && e.data.error === 'actNotFound') {
        console.log(`Account not found yet, waiting ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else {
        console.log(`Unexpected error:`, e.message);
        throw e;
      }
    }
  }
  console.log(`Account not found after ${maxTries} attempts`);
  throw new Error('Account not found after funding.');
}

// Helper: Get account sequence number
async function getAccountSequence(address) {
  try {
    const accountInfo = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    });
    return accountInfo.result.account_data.Sequence;
  } catch (error) {
    console.error('Error getting account sequence:', error);
    throw error;
  }
}

// ============================================================================
// Wallet Management Functions
// ============================================================================

/**
 * Create a new test wallet with automatic funding
 * Generates a new XRPL wallet and funds it using the testnet faucet
 * @returns {object} The created and funded wallet
 */
async function createTestWallet() {
  try {
    console.log('Starting wallet creation...');
    // Generate a new wallet using XRPL.js
    const newWallet = xrpl.Wallet.generate();
    console.log('Wallet generated:', newWallet.address);
    
    // Fund the wallet on testnet using the faucet
    console.log('Funding wallet...');
    console.log('Sending fundWallet request...');
    const fundResponse = await client.fundWallet();
    console.log('=== FUND WALLET RESPONSE ===');
    console.log('Full fundWallet() response:', JSON.stringify(fundResponse, null, 2));
    console.log('=== END FUND WALLET RESPONSE ===');
    
    // Use the funded wallet from the response (which has the correct classic address)
    const fundedWallet = fundResponse.wallet;
    console.log('Using funded wallet with classic address:', fundedWallet.classicAddress);
    
    const wallet = {
      address: fundedWallet.classicAddress,
      seed: fundedWallet.seed,
      publicKey: fundedWallet.publicKey,
      privateKey: fundedWallet.privateKey,
      fundedAmount: '10 XRP'
    };
    
    // Store the wallet address for WalletConnect
    currentWalletAddress = fundedWallet.classicAddress;
    currentWalletSeed = fundedWallet.seed;
    console.log('Wallet address stored for WalletConnect:', currentWalletAddress);
    console.log('Wallet seed stored for WalletConnect signing');
    
    // Save wallet to file for persistence
    try {
      const fs = await import('fs');
      fs.writeFileSync('./wallet.json', JSON.stringify(wallet, null, 2));
      console.log('Wallet saved to wallet.json');
    } catch (error) {
      console.error('Error saving wallet to file:', error);
    }
    
    console.log('New test wallet created:', wallet);
    return wallet;
  } catch (error) {
    console.error('Error creating test wallet:', error);
    throw error;
  }
}

// API Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ============================================================================
// REST API Endpoints
// ============================================================================

/**
 * POST /api/create-wallet
 * Create a new XRPL test wallet with automatic funding
 * Returns the wallet address, seed, and other details
 */
app.post('/api/create-wallet', async (req, res) => {
  try {
    const newWallet = await createTestWallet();
    res.json({
      success: true,
      wallet: {
        address: newWallet.address,
        seed: newWallet.seed,
        publicKey: newWallet.publicKey
      }
    });
  } catch (error) {
    console.error('Error in /api/create-wallet:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      details: error.data || null
    });
  }
});

/**
 * GET /api/balance/:address
 * Get the XRP balance for a given wallet address
 * @param {string} address - The XRPL wallet address
 * @returns {object} Balance in both drops and XRP
 */
app.get('/api/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const accountInfo = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated'
    });
    
    const balanceInDrops = accountInfo.result.account_data.Balance;
    const balanceInXRP = parseFloat(balanceInDrops) / 1000000;
    
    console.log(`Balance check for ${address}: ${balanceInDrops} drops (${balanceInXRP} XRP)`);
    
    res.json({
      success: true,
      balance: balanceInDrops,
      balanceInXRP: balanceInXRP,
      address: address
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/wallet
 * Get information about the currently loaded wallet
 * @returns {object} Wallet address and seed if available
 */
app.get('/api/wallet', (req, res) => {
  try {
    if (currentWalletAddress && currentWalletSeed) {
      res.json({
        success: true,
        wallet: {
          address: currentWalletAddress,
          seed: currentWalletSeed,
          hasWallet: true
        }
      });
    } else {
      res.json({
        success: true,
        wallet: {
          hasWallet: false
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// WalletConnect API Endpoints
// ============================================================================

/**
 * POST /api/walletconnect/connect
 * Connect to a dapp via WalletConnect v2
 * @param {string} uri - WalletConnect URI from the dapp
 * @param {string} network - Network to connect to (testnet/mainnet)
 * @returns {object} Connection details and session information
 */
app.post('/api/walletconnect/connect', async (req, res) => {
  try {
    const { uri, network = 'testnet' } = req.body;
    
    if (!uri) {
      return res.status(400).json({
        success: false,
        error: 'WalletConnect URI is required'
      });
    }

    console.log('=== WALLETCONNECT CONNECTION ATTEMPT ===');
    console.log('Connecting to WalletConnect URI:', uri);
    console.log('Selected network:', network);

    // Store the network selection for session approval
    currentNetwork = network;
    console.log('Network stored for session approval:', currentNetwork);

    // For WalletConnect v2, we need to pair with the URI
    console.log('Pairing with WalletConnect URI...');
    
    if (!walletConnectClient) {
      await initializeWalletConnect();
    }
    
    // Pair with the URI
    const pairing = await walletConnectClient.pair({ uri });
    console.log('Pairing successful:', pairing);
    
    // Get active sessions
    const sessions = walletConnectClient.session.getAll();
    console.log('Active sessions:', sessions);

    console.log('WalletConnect v2 connection ready');

    // Get connection details
    const connectionDetails = {
      connected: sessions.length > 0,
      sessions: sessions,
      pairing: pairing,
      network: network
    };
    console.log('=== CONNECTION DETAILS ===');
    console.log('Connection details:', JSON.stringify(connectionDetails, null, 2));

    res.json({
      success: true,
      message: 'WalletConnect connection established',
      details: connectionDetails
    });
  } catch (error) {
    console.error('WalletConnect connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/walletconnect/session', (req, res) => {
  res.json({
    success: true,
    connected: walletConnectClient ? walletConnectClient.session.getAll().length > 0 : false,
    sessions: walletConnectClient ? walletConnectClient.session.getAll() : []
  });
});

/**
 * GET /api/walletconnect/status
 * Get the current WalletConnect connection status
 * @returns {object} Connection status, active sessions, and pairings
 */
app.get('/api/walletconnect/status', (req, res) => {
  try {
    if (!walletConnectClient) {
      return res.json({
        success: false,
        error: 'WalletConnect not initialized'
      });
    }
    
    const sessions = walletConnectClient.session.getAll();
    const pairings = walletConnectClient.pairing.getAll();
    
    res.json({
      success: true,
      connected: sessions.length > 0,
      sessions: sessions,
      pairings: pairings,
      activePairings: pairings.filter(p => p.active)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/walletconnect/pending
 * Get information about pending connection and transaction requests
 * @returns {object} Pending connection proposals and transaction requests
 */
app.get('/api/walletconnect/pending', (req, res) => {
  try {
    res.json({
      success: true,
      pendingConnection: global.pendingConnectionProposal ? {
        id: global.pendingConnectionProposal.id,
        proposer: global.pendingConnectionProposal.params.proposer.metadata,
        requiredNamespaces: global.pendingConnectionProposal.params.requiredNamespaces,
        timestamp: global.pendingConnectionProposal.timestamp
      } : null,
      pendingTransaction: global.pendingTransactionRequest ? {
        id: global.pendingTransactionRequest.id,
        method: global.pendingTransactionRequest.params.request.method,
        transaction: global.pendingTransactionRequest.params.request.params.transaction,
        timestamp: global.pendingTransactionRequest.timestamp
      } : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get full pending connection proposal
app.get('/api/walletconnect/get-pending-connection', (req, res) => {
  try {
    if (global.pendingConnectionProposal) {
      res.json({
        success: true,
        proposal: global.pendingConnectionProposal
      });
    } else {
      res.json({
        success: false,
        error: 'No pending connection proposal'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get full pending transaction request
app.get('/api/walletconnect/get-pending-transaction', (req, res) => {
  try {
    if (global.pendingTransactionRequest) {
      res.json({
        success: true,
        request: global.pendingTransactionRequest
      });
    } else {
      res.json({
        success: false,
        error: 'No pending transaction request'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test transaction signing request (for testing purposes)
app.post('/api/walletconnect/test-transaction', async (req, res) => {
  try {
    if (!walletConnectClient) {
      return res.status(400).json({
        success: false,
        error: 'WalletConnect not initialized'
      });
    }
    
    const sessions = walletConnectClient.session.getAll();
    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active WalletConnect sessions'
      });
    }
    
    const session = sessions[0];
    console.log('=== TESTING TRANSACTION SIGNING ===');
    console.log('Using session:', session.topic);
    
    // Create a test XRPL transaction
    const testTransaction = {
      TransactionType: 'Payment',
      Account: currentWalletAddress || 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      Destination: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
      Amount: '1000000', // 1 XRP in drops
      Fee: '12',
      Sequence: 1
    };
    
    console.log('Test transaction:', testTransaction);
    
    // Request transaction signing
    const result = await walletConnectClient.request({
      topic: session.topic,
      chainId: 'xrpl:1',
      request: {
        method: 'xrpl_signTransaction',
        params: {
          transaction: testTransaction
        }
      }
    });
    
    console.log('Transaction signing result:', result);
    
    res.json({
      success: true,
      message: 'Transaction signing request sent',
      result: result
    });
  } catch (error) {
    console.error('Error testing transaction signing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual connection approval
app.post('/api/walletconnect/approve-connection', async (req, res) => {
  try {
    const proposal = global.pendingConnectionProposal;
    if (!proposal) {
      return res.status(400).json({
        success: false,
        error: 'No pending connection proposal'
      });
    }
    
    console.log('=== MANUAL CONNECTION APPROVAL ===');
    
    // Use the chain ID from the proposal (check both required and optional namespaces)
    const xrplNamespace = proposal.params.optionalNamespaces.xrpl || proposal.params.requiredNamespaces.xrpl;
    if (!xrplNamespace || !xrplNamespace.chains || xrplNamespace.chains.length === 0) {
      throw new Error('No XRPL chains found in proposal');
    }
    
    const requestedChain = xrplNamespace.chains[0];
    const xrplAddress = currentWalletAddress || 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh';
    const accountString = `${requestedChain}:${xrplAddress}`;
    
    console.log('Approving connection with account:', accountString);
    
    await walletConnectClient.approve({
      id: proposal.id,
      namespaces: {
        xrpl: {
          accounts: [accountString],
          methods: xrplNamespace.methods || [],
          events: []
        }
      }
    });
    
    console.log('Connection approved successfully!');
    global.pendingConnectionProposal = null;
    
    res.json({
      success: true,
      message: 'Connection approved successfully'
    });
  } catch (error) {
    console.error('Error approving connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual connection rejection
app.post('/api/walletconnect/reject-connection', async (req, res) => {
  try {
    const proposal = global.pendingConnectionProposal;
    if (!proposal) {
      return res.status(400).json({
        success: false,
        error: 'No pending connection proposal'
      });
    }
    
    console.log('=== MANUAL CONNECTION REJECTION ===');
    
    await walletConnectClient.reject({
      id: proposal.id,
      reason: {
        code: 1,
        message: 'User rejected the connection'
      }
    });
    
    console.log('Connection rejected successfully!');
    global.pendingConnectionProposal = null;
    
    res.json({
      success: true,
      message: 'Connection rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual transaction approval
app.post('/api/walletconnect/approve-transaction', async (req, res) => {
  try {
    const request = global.pendingTransactionRequest;
    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'No pending transaction request'
      });
    }
    
    console.log('=== MANUAL TRANSACTION APPROVAL ===');
    
    const result = await handleTransactionSigning(request);
    
    global.pendingTransactionRequest = null;
    
    res.json({
      success: true,
      message: 'Transaction signed successfully',
      result: result
    });
  } catch (error) {
    console.error('Error approving transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual transaction rejection
app.post('/api/walletconnect/reject-transaction', async (req, res) => {
  try {
    const request = global.pendingTransactionRequest;
    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'No pending transaction request'
      });
    }
    
    console.log('=== MANUAL TRANSACTION REJECTION ===');
    
    // Send error response to dapp
    const sessions = walletConnectClient.session.getAll();
    if (sessions.length > 0) {
      const session = sessions[0];
      await walletConnectClient.respond({
        topic: session.topic,
        response: {
          id: request.id,
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'User rejected the transaction'
          }
        }
      });
    }
    
    console.log('Transaction rejected successfully!');
    global.pendingTransactionRequest = null;
    
    res.json({
      success: true,
      message: 'Transaction rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Disconnect from WalletConnect
app.post('/api/walletconnect/disconnect', async (req, res) => {
  try {
    console.log('=== WALLETCONNECT DISCONNECT REQUEST ===');
    
    if (!walletConnectClient) {
      return res.status(400).json({
        success: false,
        error: 'WalletConnect client not initialized'
      });
    }
    
    // Get all active sessions
    const sessions = walletConnectClient.session.getAll();
    console.log('Active sessions before disconnect:', sessions.length);
    
    if (sessions.length === 0) {
      return res.json({
        success: true,
        message: 'No active sessions to disconnect'
      });
    }
    
    // Disconnect all sessions
    for (const session of sessions) {
      console.log('Disconnecting session:', session.topic);
      try {
        await walletConnectClient.disconnect({
          topic: session.topic,
          reason: {
            code: 6000,
            message: 'User disconnected'
          }
        });
        console.log('Session disconnected successfully:', session.topic);
      } catch (error) {
        console.error('Error disconnecting session:', session.topic, error);
      }
    }
    
    // Clear any pending requests
    global.pendingConnectionProposal = null;
    global.pendingTransactionRequest = null;
    
    console.log('All sessions disconnected successfully');
    
    res.json({
      success: true,
      message: 'Successfully disconnected from all WalletConnect sessions'
    });
  } catch (error) {
    console.error('Error disconnecting WalletConnect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// WalletConnect v2 Initialization and Event Handling
// ============================================================================

/**
 * Initialize WalletConnect v2 client and set up event listeners
 * This function sets up the WalletConnect client, modal, and all necessary event handlers
 * for handling connection proposals and transaction requests from dapps
 */
async function initializeWalletConnect() {
  try {
    // Import WalletConnect v2 modules
    const { SignClient } = await import("@walletconnect/sign-client");
    const { WalletConnectModal } = await import("@walletconnect/modal");
    
    // Clear any existing pending requests to start fresh
    global.pendingConnectionProposal = null;
    global.pendingTransactionRequest = null;
    
    walletConnectClient = await SignClient.init({
      projectId: process.env.WALLETCONNECT_PROJECT_ID || 'your-project-id',
      metadata: {
        name: 'XRPL Test Wallet',
        description: 'A simple test wallet for XRPL',
        url: 'https://your-app.com',
        icons: ['https://your-app.com/icon.png']
      }
    });
    
    walletConnectModal = new WalletConnectModal({
      projectId: process.env.WALLETCONNECT_PROJECT_ID || 'your-project-id',
      walletConnectVersion: 2
    });
    
    // Set up event listeners
    walletConnectClient.on('session_proposal', (proposal) => {
      console.log('=== WALLETCONNECT SESSION PROPOSAL ===');
      console.log('Session proposal:', JSON.stringify(proposal, null, 2));
      
      // Store the proposal for manual approval
      global.pendingConnectionProposal = proposal;
      global.pendingConnectionProposal.timestamp = Date.now();
      
      // Send the proposal to the frontend for user approval
      console.log('Session proposal received, waiting for user approval...');
      
      // Auto-clear after 5 minutes if not handled
      setTimeout(() => {
        if (global.pendingConnectionProposal && global.pendingConnectionProposal.id === proposal.id) {
          console.log('Connection proposal expired, clearing...');
          global.pendingConnectionProposal = null;
        }
      }, 5 * 60 * 1000);
    });
    
    walletConnectClient.on('session_connect', (session) => {
      console.log('=== WALLETCONNECT SESSION CONNECTED ===');
      console.log('Session connected:', JSON.stringify(session, null, 2));
    });
    
    walletConnectClient.on('session_delete', (session) => {
      console.log('=== WALLETCONNECT SESSION DELETED ===');
      console.log('Session deleted:', JSON.stringify(session, null, 2));
    });
    
    walletConnectClient.on('session_event', (event) => {
      console.log('=== WALLETCONNECT SESSION EVENT ===');
      console.log('Session event:', JSON.stringify(event, null, 2));
    });
    
    // Handle transaction signing requests
    walletConnectClient.on('session_request', (request) => {
      console.log('=== WALLETCONNECT SESSION REQUEST ===');
      console.log('Session request:', JSON.stringify(request, null, 2));
      console.log('Request method:', request.params.request.method);
      console.log('Request params:', request.params.request.params);
      
      if (request.params.request.method === 'xrpl_signTransaction') {
        console.log('=== XRPL TRANSACTION SIGNING REQUEST ===');
        console.log('Transaction to sign:', request.params.request.params);
        
        // Store the request for manual approval
        global.pendingTransactionRequest = request;
        global.pendingTransactionRequest.timestamp = Date.now();
        
        // Send the request to the frontend for user approval
        console.log('Transaction signing request received, waiting for user approval...');
        console.log('Global pending transaction request set:', global.pendingTransactionRequest ? 'YES' : 'NO');
        
        // Auto-clear after 5 minutes if not handled
        setTimeout(() => {
          if (global.pendingTransactionRequest && global.pendingTransactionRequest.id === request.id) {
            console.log('Transaction request expired, clearing...');
            global.pendingTransactionRequest = null;
          }
        }, 5 * 60 * 1000);
      } else {
        console.log('Unknown method requested:', request.params.request.method);
      }
    });
    
    // Handle session updates
    walletConnectClient.on('session_update', (update) => {
      console.log('=== WALLETCONNECT SESSION UPDATE ===');
      console.log('Session update:', JSON.stringify(update, null, 2));
    });
    
    // Handle session expiry
    walletConnectClient.on('session_expire', (session) => {
      console.log('=== WALLETCONNECT SESSION EXPIRED ===');
      console.log('Session expired:', JSON.stringify(session, null, 2));
    });
    
    console.log('WalletConnect v2 initialized');
  } catch (error) {
    console.error('Failed to initialize WalletConnect:', error);
  }
}

// Start server
async function startServer() {
  await initializeXRPL();
  await initializeWalletConnect();
  
  // Clear any existing pending requests to prevent unwanted modals
  global.pendingConnectionProposal = null;
  global.pendingTransactionRequest = null;
  
  // Try to load existing wallet from file
  try {
    const fs = await import('fs');
    if (fs.existsSync('./wallet.json')) {
      const walletData = JSON.parse(fs.readFileSync('./wallet.json', 'utf8'));
      currentWalletAddress = walletData.address;
      currentWalletSeed = walletData.seed;
      console.log('Loaded existing wallet:', currentWalletAddress);
    } else {
      console.log('No existing wallet found, will create new one when requested');
    }
  } catch (error) {
    console.log('Error loading wallet:', error.message);
  }
  
  app.listen(PORT, () => {
    console.log(`XRPL Test Wallet server running on http://localhost:${PORT}`);
    console.log('Create a new test wallet by visiting the web interface');
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (client.isConnected()) {
    await client.disconnect();
  }
  process.exit(0);
});

// Debug endpoint to manually trigger a test transaction request
app.post('/api/debug/test-transaction', async (req, res) => {
  try {
    console.log('=== MANUAL TEST TRANSACTION TRIGGER ===');
    
    if (!walletConnectClient) {
      return res.status(400).json({
        success: false,
        error: 'WalletConnect not initialized'
      });
    }
    
    const sessions = walletConnectClient.session.getAll();
    console.log('Active sessions:', sessions.length);
    
    if (sessions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active WalletConnect sessions'
      });
    }
    
    const session = sessions[0];
    console.log('Using session:', session.topic);
    
    // Create a test transaction request
    const testRequest = {
      id: Date.now(),
      topic: session.topic,
      params: {
        request: {
          method: 'xrpl_signTransaction',
          params: {
            transaction: {
              TransactionType: 'Payment',
              Account: currentWalletAddress || 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
              Destination: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
              Amount: '1000000', // 1 XRP in drops
              Fee: '12',
              Sequence: 1
            }
          }
        },
        chainId: 'xrpl:1'
      }
    };
    
    console.log('Test request created:', JSON.stringify(testRequest, null, 2));
    
    // Manually trigger the session_request event
    global.pendingTransactionRequest = testRequest;
    global.pendingTransactionRequest.timestamp = Date.now();
    
    console.log('Test transaction request stored in global state');
    
    res.json({
      success: true,
      message: 'Test transaction request created and stored',
      request: testRequest
    });
  } catch (error) {
    console.error('Error creating test transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

startServer().catch(console.error); 

// Get pending requests for frontend approval
app.get('/api/walletconnect/pending-requests', (req, res) => {
  try {
    console.log('=== PENDING REQUESTS CHECK ===');
    console.log('Global pending connection proposal:', global.pendingConnectionProposal ? 'EXISTS' : 'NULL');
    console.log('Global pending transaction request:', global.pendingTransactionRequest ? 'EXISTS' : 'NULL');
    
    res.json({
      connectionRequest: global.pendingConnectionProposal ? {
        id: global.pendingConnectionProposal.id,
        proposal: global.pendingConnectionProposal,
        timestamp: global.pendingConnectionProposal.timestamp
      } : null,
      transactionRequest: global.pendingTransactionRequest ? {
        id: global.pendingTransactionRequest.id,
        request: global.pendingTransactionRequest,
        timestamp: global.pendingTransactionRequest.timestamp
      } : null
    });
  } catch (error) {
    console.error('Error in pending-requests endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}); 