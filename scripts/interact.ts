import Web3 from "web3";
import { TransactionReceipt, TransactionConfig } from "web3-core";
import { AbiItem } from "web3-utils";
import * as dotenv from "dotenv";
import * as contractAbi from "../artifacts/contracts/NFTLending.sol/NFTLending.json";
import * as mockNftAbi from "../artifacts/contracts/test/MockNFT.sol/MockNFT.json";

dotenv.config();

// Environment variables for blockchain configuration
const LINEA_RPC_URL = process.env.LINEA_RPC_URL || "";
const SIGNER_ADDRESS = process.env.SIGNER_ADDRESS || "";
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";
const MOCK_NFT_CONTRACT_ADDRESS = process.env.MOCK_NFT_CONTRACT_ADDRESS || "";
const CHAIN_ID = 59141; // Linea blockchain chain ID

// Initialize Web3 provider
const web3 = new Web3(new Web3.providers.HttpProvider(LINEA_RPC_URL));

// Interface representing a blockchain contract
interface BlockchainContract {
  contractAddress: string;
  abi: AbiItem[];
}

// Base class for blockchain contracts
class BaseBlockchainContract implements BlockchainContract {
  contractAddress: string;
  abi: AbiItem[];
  web3Contract: Web3.eth.Contract;

  constructor(contractAddress: string, abi: AbiItem[]) {
    this.contractAddress = contractAddress;
    this.abi = abi;
    // Initialize the contract instance with ABI and contract address
    this.web3Contract = new web3.eth.Contract(this.abi, this.contractAddress);
  }
}

// Class representing the NFT Contract, extending the base contract
class NFTContract extends BaseBlockchainContract {
  constructor(contractAddress: string, abi: AbiItem[]) {
    super(contractAddress, abi);
  }

  /**
   * Mint a new NFT to the given address.
   * @param address Address of the recipient.
   * @param nftId Unique identifier for the NFT.
   * @returns Transaction receipt or null in case of failure.
   */
  async mint(address: string, nftId: string): Promise<TransactionReceipt | null> {
    try {
      const tx = this.web3Contract.methods.mint(address, nftId);
      return await this.sendSignedTransaction(tx);
    } catch (error) {
      console.error("Error minting NFT:", error);
      return null;
    }
  }

  /**
   * Approve another address to control a specific NFT.
   * @param address Address to approve.
   * @param nftId NFT identifier to approve control of.
   * @returns Transaction receipt or null in case of failure.
   */
  async approve(address: string, nftId: string): Promise<TransactionReceipt | null> {
    try {
      const tx = this.web3Contract.methods.approve(address, nftId);
      return await this.sendSignedTransaction(tx);
    } catch (error) {
      console.error("Error approving NFT:", error);
      return null;
    }
  }

  /**
   * Check the balance of NFTs owned by the provided address.
   * @param address Address to check balance for.
   * @returns Balance as a bigint or 0 if an error occurs.
   */
  async balanceOf(address: string): Promise<bigint> {
    try {
      const balance: bigint = await this.web3Contract.methods.balanceOf(address).call();
      console.log(`Balance: ${balance}`);
      return balance;
    } catch (error) {
      console.error("Error retrieving balance:", error);
      return 0n;
    }
  }

  /**
   * Helper function to sign and send a transaction.
   * @param tx Web3 transaction object of type MethodReturnContext.
   * @returns Transaction receipt or null in case of failure.
   */
  private async sendSignedTransaction(
    tx: Web3.eth.ContractSendMethod
  ): Promise<TransactionReceipt | null> {
    try {
      const nonce = await web3.eth.getTransactionCount(SIGNER_ADDRESS);
      const gas = await tx.estimateGas({ from: SIGNER_ADDRESS });
      const gasPrice = await web3.eth.getGasPrice();

      // Create the transaction configuration object
      const txConfig: TransactionConfig = {
        from: SIGNER_ADDRESS,
        to: this.contractAddress,
        data: tx.encodeABI(),
        nonce,
        gas,
        gasPrice,
        chainId: CHAIN_ID,
      };

      // Sign the transaction with the private key
      const signedTx = await web3.eth.accounts.signTransaction(txConfig, DEPLOYER_PRIVATE_KEY);

      // Send the signed transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction || "");
      console.log(`Mined in block ${receipt.blockNumber}`);
      return receipt;
    } catch (error) {
      console.error("Error sending signed transaction:", error);
      return null;
    }
  }
}

// Class representing the Lending Contract, extending the base contract
class LendingContract extends BaseBlockchainContract {
  constructor(contractAddress: string, abi: AbiItem[]) {
    super(contractAddress, abi);
  }

  /**
   * Deposit funds into the lending protocol.
   * @param amount Amount to deposit in Wei.
   * @returns Transaction receipt or null in case of failure.
   */
  async depositFunds(amount: number): Promise<TransactionReceipt | null> {
    try {
      const tx = this.web3Contract.methods.depositFunds();
      return await this.sendSignedTransaction(tx, amount);
    } catch (error) {
      console.error("Error depositing funds:", error);
      return null;
    }
  }

  /**
   * Create a loan by lending an NFT.
   * @param nftAddress Address of the NFT contract.
   * @param nftId Unique identifier for the NFT.
   * @param amount Loan amount in Wei.
   * @returns Transaction receipt or null in case of failure.
   */
  async createLoan(
    nftAddress: string,
    nftId: number,
    amount: number
  ): Promise<TransactionReceipt | null> {
    try {
      const tx = this.web3Contract.methods.createLoan(nftAddress, nftId, amount);
      return await this.sendSignedTransaction(tx);
    } catch (error) {
      console.error("Error creating loan:", error);
      return null;
    }
  }

  async repayLoan(loanId: number, loanAmount: number): Promise<TransactionReceipt | null> {
    try {
      const repayAmount = await this.web3Contract.methods
        .calculateRepaymentAmount(loanAmount)
        .call();
      const tx = this.web3Contract.methods.repayLoan(loanId);
      return await this.sendSignedTransaction(tx, repayAmount);
    } catch (error) {
      console.error("Error repaying loan:", error);
      return null;
    }
  }

  /**
   * Get the total number of loans issued by the protocol.
   * @returns The total number of loans.
   */
  async getTotalLoans(): Promise<number> {
    try {
      const totalLoans = await this.web3Contract.methods.totalLoans().call();
      console.log(`Total loans: ${totalLoans}`);
      return totalLoans;
    } catch (error) {
      console.error("Error retrieving total loans:", error);
      return 0;
    }
  }

  /**
   * Get the current interest rate of the lending protocol.
   * @returns The interest rate as a percentage.
   */
  async getInterestRate(): Promise<number> {
    try {
      const interestRate = await this.web3Contract.methods.interestRate().call();
      console.log(`Interest Rate: ${interestRate}`);
      return interestRate;
    } catch (error) {
      console.error("Error retrieving interest rate:", error);
      return 0;
    }
  }

  /**
   * Get the loan duration for loans issued by the protocol.
   * @returns The loan duration in seconds.
   */
  async getLoanDuration(): Promise<number> {
    try {
      const loanDuration = await this.web3Contract.methods.loanDuration().call();
      console.log(`Loan Duration: ${loanDuration}`);
      return loanDuration;
    } catch (error) {
      console.error("Error retrieving loan duration:", error);
      return 0;
    }
  }

  /**
   * Helper function to sign and send a transaction.
   * @param tx Web3 transaction object of type MethodReturnContext.
   * @param value Amount to send in Wei (default: 0).
   * @returns Transaction receipt or null in case of failure.
   */
  private async sendSignedTransaction(
    tx: Web3.eth.ContractSendMethod,
    value: number = 0
  ): Promise<TransactionReceipt | null> {
    try {
      const nonce = await web3.eth.getTransactionCount(SIGNER_ADDRESS);
      const gas = await tx.estimateGas({ from: SIGNER_ADDRESS, value });
      const gasPrice = await web3.eth.getGasPrice();

      // Create the transaction configuration object
      const txConfig: TransactionConfig = {
        from: SIGNER_ADDRESS,
        to: this.contractAddress,
        data: tx.encodeABI(),
        nonce,
        gas,
        gasPrice,
        chainId: CHAIN_ID,
        value: value.toString(),
      };

      // Sign the transaction with the private key
      const signedTx = await web3.eth.accounts.signTransaction(txConfig, DEPLOYER_PRIVATE_KEY);

      // Send the signed transaction
      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction || "");
      console.log(`Mined in block ${receipt.blockNumber}`);
      return receipt;
    } catch (error) {
      console.error("Error sending signed transaction:", error);
      return null;
    }
  }
}

// Main execution function
async function main() {
  try {
    const nftContract = new NFTContract(MOCK_NFT_CONTRACT_ADDRESS, mockNftAbi.abi as AbiItem[]);
    const lendingContract = new LendingContract(CONTRACT_ADDRESS, contractAbi.abi as AbiItem[]);

    // Read protocol information
    await lendingContract.getTotalLoans();
    await lendingContract.getInterestRate();
    await lendingContract.getLoanDuration();

    // View NFT balance
    await nftContract.balanceOf(SIGNER_ADDRESS);

    // Uncomment the following lines to perform transactions
    // await nftContract.mint(SIGNER_ADDRESS, "1");
    // await lendingContract.depositFunds(1000);
    // await nftContract.approve(CONTRACT_ADDRESS, "1");
    // await lendingContract.createLoan(MOCK_NFT_CONTRACT_ADDRESS, 1, 10);
    await lendingContract.repayLoan(0, 10);
  } catch (error) {
    console.error("Error in main:", error);
  }
}

// Execute the main function
main();
