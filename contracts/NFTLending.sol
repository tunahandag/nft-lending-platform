// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";


/**
 * @title NFTLending
 * @author @tunahandag
 * @dev Contract for lending ETH against NFT collaterals
 * Borrowers can lock their NFTs as collateral and borrow ETH
 * Lenders can deposit ETH into the contract to provide liquidity for loans
 * Borrowers can repay the loan and claim back their NFTs
 * If the borrower does not repay the loan within the loan duration, the NFT is claimed by the contract owner
 * The contract owner can withdraw funds from the contract
 */
contract NFTLending is ReentrancyGuard, Pausable, Ownable {
    
    uint256 public interestRate; // Interest rate in basis points (e.g., 500 for 5%)
    uint256 public maxPercentageForLoans = 8000; // Loan can be 80% of the NFT price
    uint256 public loanDuration; // Loan duration in seconds is fixed for every loan
    uint256 public totalLoans; // Total number of loans created
    uint256 public maxNumberOfLendingsPerWallet = 2; // Maximum number of loans per wallet

    // Struct to represent a loan
    struct Loan {
        address borrower; // The borrower of the loan
        address nftAddress; // The address of the NFT contract
        uint256 nftId; // The token ID of the NFT
        uint256 loanAmount; // The amount of the loan
        uint256 loanStart; // The timestamp when the loan was created
        bool isActive; // Flag to check if the loan is active
    }

    mapping(uint256 => Loan) public loans; // Mapping from loan ID to Loan
    mapping(address => mapping(uint256 => bool)) public collateralizedNFTs; // Mapping from NFT ID to boolean to check if the NFT is already collateralized
    mapping(address => uint256) loanCountPerWallet; // Mapping from wallet address to the number of loans created by the wallet

    // Events
    event LoanCreated(address indexed borrower, uint256 indexed loanId, uint256 nftId, uint256 loanAmount);
    event LoanRepaid(address indexed borrower, uint256 indexed loanId, uint256 nftId);
    event NFTClaimed(address indexed owner, uint256 indexed loanId, uint256 nftId);

    // Errors
    error TooManyLoans();
    error InsufficientContractBalance();
    error UnauthorizedTransfer();
    error TransferFailed();
    error LoanDeactive();
    error LoanNotExpired();
    error LoanExpired();
    error LoanAmountTooHigh();
    error UnauthorizedBorrower();
    error NotOwner();
    error AlreadyCollateralized();
    error InsufficientAmount();

    /**
     * @dev Constructor to initialize the interest rate and loan duration
     * @param _interestRate The interest rate in basis points
     * @param _loanDuration The duration of the loan in seconds
     */
    constructor(uint256 _interestRate, uint256 _loanDuration) Ownable(msg.sender){
        interestRate = _interestRate;
        loanDuration = _loanDuration;
    }
    
    /**
     * @dev Function to create a loan by collateralizing an NFT
     * @param _nftAddress The address of the NFT contract
     * @param _nftId The token ID of the NFT
     * @param _loanAmount The amount of the loan
     * @notice The borrower must be the owner of the NFT
     * @notice The NFT must be approved for transfer by the contract
     * @notice The contract must have enough balance to transfer the loan amount
     * @notice The loan amount must be less than the maximum percentage of the NFT price
     * @notice The borrower can only have a maximum number of loans
     * @notice The NFT must not be already collateralized
     */
    function createLoan(address _nftAddress, uint256 _nftId, uint256 _loanAmount) external nonReentrant whenNotPaused{
        if(IERC721(_nftAddress).ownerOf(_nftId) != msg.sender) revert NotOwner();
        // if(collateralizedNFTs[_nftId]) revert AlreadyCollateralized();
        if(address(this).balance < _loanAmount) revert InsufficientContractBalance();
        if(IERC721(_nftAddress).getApproved(_nftId) != address(this)) revert UnauthorizedTransfer();
        if(loanCountPerWallet[msg.sender] >= maxNumberOfLendingsPerWallet) revert TooManyLoans();
        if(_loanAmount > getNFTPrice() * maxPercentageForLoans / 10000) revert LoanAmountTooHigh();

        // Create the loan
        Loan memory newLoan = Loan({
            borrower: msg.sender,
            nftAddress: _nftAddress,
            nftId: _nftId,
            loanAmount: _loanAmount,
            loanStart: block.timestamp,
            isActive: true
        });
        loanCountPerWallet[msg.sender]++;
        // Transfer NFT to the contract as collateral
        // ERC721 transferFrom method already checks for zero address and ownership so no need to add guards here
        IERC721(_nftAddress).transferFrom(msg.sender, address(this), _nftId);
        loans[totalLoans] = newLoan;
        collateralizedNFTs[_nftAddress][_nftId] = true;
        totalLoans++;
        // Transfer loan amount to the borrower
        transferETH(payable(msg.sender), _loanAmount);
        emit LoanCreated(msg.sender, totalLoans - 1, _nftId, _loanAmount);
    }

    /**
     * @dev Function to repay a loan by transferring the loan amount to the contract with interest
     * @param _loanId The ID of the loan
     */
    function repayLoan(uint256 _loanId) external payable nonReentrant whenNotPaused {
        Loan storage loan = loans[_loanId];
        if(!loan.isActive) revert LoanDeactive();
        if(loan.borrower != msg.sender) revert UnauthorizedBorrower();
        if(block.timestamp > loan.loanStart + loanDuration) revert LoanExpired();
        uint256 totalRepayment = calculateRepaymentAmount(loan.loanAmount);
        if(msg.value < totalRepayment) revert InsufficientAmount();


        // Transfer NFT back to the borrower
        IERC721(loan.nftAddress).transferFrom(address(this), msg.sender, loan.nftId);
        // Mark the loan as inactive
        loan.isActive = false;
        collateralizedNFTs[loan.nftAddress][loan.nftId] = false;

        emit LoanRepaid(msg.sender, _loanId, loan.nftId);
    }

    /**
     * @dev Function to claim an NFT by the contract owner if the loan is not repaid within the loan duration
     * @param _loanId The ID of the loan
     */
    function claimNFT(uint256 _loanId) external onlyOwner {
        Loan storage loan = loans[_loanId];
        if(!loan.isActive) revert LoanDeactive();
        if(block.timestamp < loan.loanStart + loanDuration) revert LoanNotExpired();
        // Transfer NFT to the contract owner
        IERC721(loan.nftAddress).safeTransferFrom(address(this), owner(), loan.nftId);
        // Mark the loan as inactive
        loan.isActive = false;
        collateralizedNFTs[loan.nftAddress][loan.nftId] = false;
        emit NFTClaimed(owner(), _loanId, loan.nftId);
    }

    /**
     * @dev Function to calculate the repayment amount with interest
     * @param _loanAmount The amount of the loan
     * @return The total repayment amount with interest
     */
    function calculateRepaymentAmount(uint256 _loanAmount) public view returns (uint256) {
        return _loanAmount + ((_loanAmount * interestRate) / 10000);
    }

    /**
     * @dev Function to deposit ETH into the contract to provide liquidity for loans
     */
    function depositFunds() external payable onlyOwner {
    }

    /**
     * @dev Function to withdraw ETH from the contract
     * @param _amount The amount of ETH to withdraw
     * @notice The contract owner can withdraw funds from the contract
     */
    function withdrawFunds(uint256 _amount) external onlyOwner {
        if(_amount > address(this).balance) revert InsufficientContractBalance();
        transferETH(payable(owner()), _amount);
    }

    /**
     * @dev Transfer ETH to given address
     * @param _to The address to transfer ETH
     * @param _amount The amount of ETH to transfer
     * @notice This function is used to transfer ETH to given address
     */
    function transferETH(address payable _to, uint256 _amount) internal {
        // Call returns a boolean value indicating success or failure.
        // This is the current recommended method to use.
        (bool sent, ) = _to.call{value: _amount}("");
        if(!sent) revert TransferFailed();
    }

    /**
     * @dev Get the price of the NFT
     * @return The price of the NFT
     * @notice This function is used to get the price of the NFT, can be improved by connecting it to an oracle
     */
    function getNFTPrice() public pure returns (uint256) {
        return 100;
    }

    /**
     * @dev Fallback function to accept ETH
     */
    receive() external payable {}

    /**
     * @dev Function to pause the contract
     * @notice The contract owner can pause the contract
     */
    function pause(bool value) external onlyOwner {
        if(value) {
            _pause();
            return;
        }
        _unpause();
    }
}