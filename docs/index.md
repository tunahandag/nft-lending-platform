# Solidity API

## NFTLending

_Contract for lending ETH against NFT collaterals
Borrowers can lock their NFTs as collateral and borrow ETH
Lenders can deposit ETH into the contract to provide liquidity for loans
Borrowers can repay the loan and claim back their NFTs
If the borrower does not repay the loan within the loan duration, the NFT is claimed by the contract owner
The contract owner can withdraw funds from the contract_

### interestRate

```solidity
uint256 interestRate
```

### maxPercentageForLoans

```solidity
uint256 maxPercentageForLoans
```

### loanDuration

```solidity
uint256 loanDuration
```

### totalLoans

```solidity
uint256 totalLoans
```

### maxNumberOfLendingsPerWallet

```solidity
uint256 maxNumberOfLendingsPerWallet
```

### Loan

```solidity
struct Loan {
  address borrower;
  address nftAddress;
  uint256 nftId;
  uint256 loanAmount;
  uint256 loanStart;
  bool isActive;
}
```

### loans

```solidity
mapping(uint256 => struct NFTLending.Loan) loans
```

### collateralizedNFTs

```solidity
mapping(address => mapping(uint256 => bool)) collateralizedNFTs
```

### loanCountPerWallet

```solidity
mapping(address => uint256) loanCountPerWallet
```

### LoanCreated

```solidity
event LoanCreated(address borrower, uint256 loanId, uint256 nftId, uint256 loanAmount)
```

### LoanRepaid

```solidity
event LoanRepaid(address borrower, uint256 loanId, uint256 nftId)
```

### NFTClaimed

```solidity
event NFTClaimed(address owner, uint256 loanId, uint256 nftId)
```

### TooManyLoans

```solidity
error TooManyLoans()
```

### InsufficientContractBalance

```solidity
error InsufficientContractBalance()
```

### UnauthorizedTransfer

```solidity
error UnauthorizedTransfer()
```

### TransferFailed

```solidity
error TransferFailed()
```

### LoanDeactive

```solidity
error LoanDeactive()
```

### LoanNotExpired

```solidity
error LoanNotExpired()
```

### LoanExpired

```solidity
error LoanExpired()
```

### LoanAmountTooHigh

```solidity
error LoanAmountTooHigh()
```

### UnauthorizedBorrower

```solidity
error UnauthorizedBorrower()
```

### NotOwner

```solidity
error NotOwner()
```

### AlreadyCollateralized

```solidity
error AlreadyCollateralized()
```

### InsufficientAmount

```solidity
error InsufficientAmount()
```

### constructor

```solidity
constructor(uint256 _interestRate, uint256 _loanDuration) public
```

_Constructor to initialize the interest rate and loan duration_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _interestRate | uint256 | The interest rate in basis points |
| _loanDuration | uint256 | The duration of the loan in seconds |

### createLoan

```solidity
function createLoan(address _nftAddress, uint256 _nftId, uint256 _loanAmount) external
```

The borrower must be the owner of the NFT
The NFT must be approved for transfer by the contract
The contract must have enough balance to transfer the loan amount
The loan amount must be less than the maximum percentage of the NFT price
The borrower can only have a maximum number of loans
The NFT must not be already collateralized

_Function to create a loan by collateralizing an NFT_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _nftAddress | address | The address of the NFT contract |
| _nftId | uint256 | The token ID of the NFT |
| _loanAmount | uint256 | The amount of the loan |

### repayLoan

```solidity
function repayLoan(uint256 _loanId) external payable
```

_Function to repay a loan by transferring the loan amount to the contract with interest_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _loanId | uint256 | The ID of the loan |

### claimNFT

```solidity
function claimNFT(uint256 _loanId) external
```

_Function to claim an NFT by the contract owner if the loan is not repaid within the loan duration_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _loanId | uint256 | The ID of the loan |

### calculateRepaymentAmount

```solidity
function calculateRepaymentAmount(uint256 _loanAmount) public view returns (uint256)
```

_Function to calculate the repayment amount with interest_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _loanAmount | uint256 | The amount of the loan |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total repayment amount with interest |

### depositFunds

```solidity
function depositFunds() external payable
```

_Function to deposit ETH into the contract to provide liquidity for loans_

### withdrawFunds

```solidity
function withdrawFunds(uint256 _amount) external
```

The contract owner can withdraw funds from the contract

_Function to withdraw ETH from the contract_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _amount | uint256 | The amount of ETH to withdraw |

### transferETH

```solidity
function transferETH(address payable _to, uint256 _amount) internal
```

This function is used to transfer ETH to given address

_Transfer ETH to given address_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _to | address payable | The address to transfer ETH |
| _amount | uint256 | The amount of ETH to transfer |

### getNFTPrice

```solidity
function getNFTPrice() public pure returns (uint256)
```

This function is used to get the price of the NFT, can be improved by connecting it to an oracle

_Get the price of the NFT_

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The price of the NFT |

### receive

```solidity
receive() external payable
```

_Fallback function to accept ETH_

### pause

```solidity
function pause(bool value) external
```

The contract owner can pause the contract

_Function to pause the contract_

## MockNFT

### baseURI

```solidity
string baseURI
```

### constructor

```solidity
constructor(string _name, string _symbol, string _baseUri) public
```

### mint

```solidity
function mint(address _to, uint256 tokenId) external
```

### _baseURI

```solidity
function _baseURI() internal view virtual returns (string)
```

Return baseURI

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | baseTokenURI baseTokenURI of the contract at the moment |

### tokenURI

```solidity
function tokenURI(uint256 tokenId) public view returns (string)
```

_tokenURI returns the uri to metadata_

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| tokenId | uint256 | tokenId |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | tokenURI for given tokenId if exists |

