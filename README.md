# NFT Lending Platform

This project is an NFT Lending and Borrowing platform, built with Solidity smart contracts and Hardhat, enabling users to lend and borrow NFTs securely.

## Features

- **Lending NFTs:** Lend your NFTs to others and earn interest.
- **Borrowing NFTs:** Borrow NFTs by providing collateral.
- **Automated smart contract interaction:** Integrates with MetaMask for seamless transactions.
- **Interest and loan management:** Track interest rates and loan durations via smart contracts.

## Prerequisites

Ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/en/) (v16.x or later)
- [Hardhat](https://hardhat.org/) (for smart contract development and testing)
- [Solidity Compiler](https://soliditylang.org/) (version 0.8.x or later)

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/tunahandag/nft-lending-platform.git
   cd nft-lending-platform
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Configuration:**

   Create a `.env` file in the root directory and add the necessary environment variables:

   ```bash
   LINEA_RPC_URL=<your_rpc_url>
   CONTRACT_ADDRESS=<your_contract_address>
   MOCK_NFT_CONTRACT_ADDRESS=<mock_nft_contract_address>
   SIGNER_ADDRESS=<your_signer_address>
   DEPLOYER_PRIVATE_KEY=<your_private_key>
   ```

## Usage

### Running Tests

To run the test suite for the smart contracts:

```bash
npx hardhat test --network hardhat
```

### Smart Contract Deployment

You can deploy the contracts using Hardhat's deployment scripts:

```bash
npx hardhat ignition deploy ignition/modules/NFTLendingPlatform.ts --network linea

```

### Interacting with the Platform

You can interact with the deployed contracts using the provided scripts in the `scripts/` directory:

```bash
npx hardhat run scripts/interact.ts
```

1. **Mint NFTs:**

   You can use the `mintMockNfts` function to mint test NFTs.

2. **Fund the Lending Protocol:**

   You can deposit funds into the lending protocol using the `fundLendingProtocol` function.

3. **Lend an NFT:**

   Lend an NFT by calling the `lendNft` function and providing the NFT address, ID, and loan amount.

4. **Repay your loan:**

   Repay your loan by calling the `repayLoan` function and providing the loan ID, and loan amount with interest rate added on top.

5. **Claim an NFT:**

   Claim an NFT that has not been repaid in the given loan duration by calling the `claimNFT` function and providing the loan ID.

### Scripts

- **Commiting Code**:

  This project uses `git-cz` to standardize commit messages:

  ```bash
  npm run commit
  ```

## Project Structure

- **contracts/**: Contains the Solidity smart contracts, including NFT lending logic.
- **scripts/**: Contains scripts to interact with the deployed contracts (e.g., deployment, minting, lending).
- **test/**: Contains the test files for the contracts, written in JavaScript/TypeScript.
- **ignition/**: Deployment automation scripts and tools.
- **docs/**: Documentation generation tools (e.g., Solidity DocGen).
- **hardhat.config.ts**: Hardhat configuration file for setting up the development environment.
- **package.json**: Lists the dependencies and scripts for the project.

## License

This project is licensed under the **GPL-3.0-only** License. See the [LICENSE](LICENSE) file for more details.

## Author

- **Tunahan Dağ** - [tunahandag](https://github.com/tunahandag)
