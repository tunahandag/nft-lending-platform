import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("NFTLending", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTLendingFixture() {
    const ONE_MONTH_IN_SECS = 24 * 60 * 60;
    const INTEREST_RATE = 500; // 5% in basis points

    const [owner, alice, bob, cedric] = await hre.ethers.getSigners();

    const NFTLending = await hre.ethers.getContractFactory("NFTLending");
    const nftLending = await NFTLending.deploy(INTEREST_RATE, ONE_MONTH_IN_SECS);

    // deploy the mock nft contract
    const MockNFT = await hre.ethers.getContractFactory("MockNFT");
    const mockNFT = await MockNFT.deploy("MOCK", "MCK");

    return { nftLending, mockNFT, ONE_MONTH_IN_SECS, INTEREST_RATE, owner, alice, bob, cedric };
  }

  describe("Deployment", function () {
    it("Should set the right loan duration", async function () {
      const { nftLending, ONE_MONTH_IN_SECS } = await loadFixture(deployNFTLendingFixture);

      expect(await nftLending.loanDuration()).to.equal(ONE_MONTH_IN_SECS);
    });

    it("Should set the right owner", async function () {
      const { nftLending, owner } = await loadFixture(deployNFTLendingFixture);

      expect(await nftLending.owner()).to.equal(owner.address);
    });

    it("Should have the correct interest rate", async function () {
      const { nftLending, INTEREST_RATE } = await loadFixture(deployNFTLendingFixture);

      expect(await nftLending.interestRate()).to.equal(INTEREST_RATE);
    });
    it("Fund the contract to get started with lending", async function () {
      const { nftLending, owner, alice } = await loadFixture(deployNFTLendingFixture);
      const fundAmount: number = 100000000;
      await nftLending.connect(owner).depositFunds({ value: fundAmount });

      await expect(
        nftLending.connect(alice).depositFunds({ value: fundAmount })
      ).to.be.revertedWithCustomError(nftLending, "OwnableUnauthorizedAccount");
      expect(await hre.ethers.provider.getBalance(nftLending.target)).to.equal(fundAmount);
      await expect(
        nftLending.connect(alice).withdrawFunds(fundAmount)
      ).to.be.revertedWithCustomError(nftLending, "OwnableUnauthorizedAccount");
      await expect(
        nftLending.connect(owner).withdrawFunds(fundAmount + 10)
      ).to.be.revertedWithCustomError(nftLending, "InsufficientContractBalance");
      await nftLending.connect(owner).withdrawFunds(fundAmount);
      expect(await hre.ethers.provider.getBalance(nftLending.target)).to.equal(0);
    });
  });

  describe("Lending & Borrowing Operations", function () {
    describe("Lending", function () {
      it("Lend a NFT & Repay your loan", async function () {
        const { nftLending, mockNFT, owner, bob } = await loadFixture(deployNFTLendingFixture);
        const fundAmount: number = 100000000;
        const nftId: number = 1; // for owner
        const loanAmount: number = 1000;

        // mint tokens
        await mockNFT.connect(owner).mint(owner.address, nftId);
        await mockNFT.connect(bob).mint(bob.address, 2);
        await mockNFT.connect(owner).mint(owner.address, 3);
        // approve the lending contract to use the nft
        await mockNFT.connect(owner).approve(nftLending.target, 1);
        await nftLending.connect(owner).depositFunds({ value: fundAmount });

        await expect(
          nftLending.connect(owner).createLoan(mockNFT.target, 2, loanAmount)
        ).to.be.revertedWithCustomError(nftLending, "NotOwner");

        await expect(nftLending.connect(owner).createLoan(mockNFT.target, nftId, loanAmount))
          .to.emit(nftLending, "LoanCreated")
          .withArgs(owner.address, 0, nftId, loanAmount);

        await expect(
          nftLending.connect(owner).createLoan(mockNFT.target, 3, loanAmount)
        ).to.be.revertedWithCustomError(nftLending, "UnauthorizedTransfer");

        await mockNFT.connect(owner).approve(nftLending.target, 3);

        const highLoanAmount = hre.ethers.parseUnits("10", "ether");

        await expect(
          nftLending.connect(owner).createLoan(mockNFT.target, 3, highLoanAmount)
        ).to.be.revertedWithCustomError(nftLending, "InsufficientContractBalance");

        await nftLending.depositFunds({ value: highLoanAmount });

        await expect(
          nftLending.connect(owner).createLoan(mockNFT.target, 3, highLoanAmount)
        ).to.be.revertedWithCustomError(nftLending, "LoanAmountTooHigh");

        await nftLending.withdrawFunds(highLoanAmount);

        expect(await nftLending.totalLoans()).to.equal(1);
        expect(await hre.ethers.provider.getBalance(nftLending.target)).to.equal(
          fundAmount - loanAmount
        );
        expect(await mockNFT.ownerOf(nftId)).to.equal(nftLending.target);

        // repay the loan with interest
        const paymentAmount = await nftLending.calculateRepaymentAmount(loanAmount);

        await expect(
          nftLending.connect(owner).repayLoan(0, { value: Number(paymentAmount) - 1 })
        ).to.be.revertedWithCustomError(nftLending, "InsufficientAmount");

        await expect(nftLending.connect(owner).repayLoan(0, { value: paymentAmount }))
          .to.emit(nftLending, "LoanRepaid")
          .withArgs(owner.address, 0, nftId);

        await expect(
          nftLending.connect(owner).repayLoan(0, { value: paymentAmount })
        ).to.be.revertedWithCustomError(nftLending, "LoanDeactive");

        expect(await hre.ethers.provider.getBalance(nftLending.target)).to.equal(
          fundAmount - loanAmount + Number(paymentAmount)
        );
        expect(await mockNFT.ownerOf(1)).to.equal(owner.address);
      });

      it("Lend a NFT and lose it if you do not pay in time", async function () {
        const { nftLending, mockNFT, owner, alice, bob, ONE_MONTH_IN_SECS } = await loadFixture(
          deployNFTLendingFixture
        );
        const fundAmount: number = 100000000;
        // mint tokens
        await mockNFT.connect(alice).mint(alice.address, 1);
        // approve the lending contract to use the nft
        await mockNFT.connect(alice).approve(nftLending.target, 1);
        await nftLending.connect(owner).depositFunds({ value: fundAmount });

        const loanAmount: number = 1000;
        const nftId: number = 1;
        await expect(nftLending.connect(alice).pause(true)).to.be.revertedWithCustomError(
          nftLending,
          "OwnableUnauthorizedAccount"
        );

        await expect(nftLending.connect(alice).createLoan(mockNFT.target, nftId, loanAmount))
          .to.emit(nftLending, "LoanCreated")
          .withArgs(alice.address, 0, nftId, loanAmount);
        expect(await nftLending.totalLoans()).to.equal(1);
        expect(await hre.ethers.provider.getBalance(nftLending.target)).to.equal(
          fundAmount - loanAmount
        );
        expect(await mockNFT.ownerOf(nftId)).to.equal(nftLending.target);

        await expect(
          nftLending.connect(bob).repayLoan(0, { value: loanAmount })
        ).to.be.revertedWithCustomError(nftLending, "UnauthorizedBorrower");

        await expect(nftLending.claimNFT(0)).to.be.revertedWithCustomError(
          nftLending,
          "LoanNotExpired"
        );
        await nftLending.pause(true);
        await expect(nftLending.connect(alice).createLoan(mockNFT.target, nftId, loanAmount)).to.be
          .reverted;
        await expect(nftLending.connect(alice).repayLoan(0, { value: loanAmount })).to.be.reverted;
        await nftLending.pause(false);
        await time.increase(ONE_MONTH_IN_SECS + 60 * 60 * 10); // 1 month + 10 hours

        await expect(
          nftLending.connect(alice).repayLoan(0, { value: loanAmount })
        ).to.be.revertedWithCustomError(nftLending, "LoanExpired");

        await expect(nftLending.connect(alice).claimNFT(0)).to.be.revertedWithCustomError(
          nftLending,
          "OwnableUnauthorizedAccount"
        );
        await expect(nftLending.connect(owner).claimNFT(0))
          .to.emit(nftLending, "NFTClaimed")
          .withArgs(owner.address, 0, nftId);

        await expect(nftLending.connect(owner).claimNFT(0)).to.be.revertedWithCustomError(
          nftLending,
          "LoanDeactive"
        );
      });

      it("Cannot exceed max loan per wallet", async function () {
        const { nftLending, owner, mockNFT } = await loadFixture(deployNFTLendingFixture);

        await mockNFT.connect(owner).mint(owner.address, 1);
        await mockNFT.connect(owner).mint(owner.address, 2);
        await mockNFT.connect(owner).mint(owner.address, 3);
        await mockNFT.connect(owner).approve(nftLending.target, 1);
        await mockNFT.connect(owner).approve(nftLending.target, 2);
        await mockNFT.connect(owner).approve(nftLending.target, 3);

        const loanAmount: number = 1000;
        await nftLending.connect(owner).depositFunds({ value: 100000000 });
        await nftLending.connect(owner).createLoan(mockNFT.target, 1, loanAmount);
        await nftLending.connect(owner).createLoan(mockNFT.target, 2, loanAmount);
        await expect(
          nftLending.connect(owner).createLoan(mockNFT.target, 3, loanAmount)
        ).to.be.revertedWithCustomError(nftLending, "TooManyLoans");
      });
    });

    // describe("Events", function () {
    //   it("Should emit an event on withdrawals", async function () {
    //     const { lock, unlockTime, lockedAmount } = await loadFixture(deployOneYearLockFixture);

    //     await time.increaseTo(unlockTime);

    //     await expect(lock.withdraw()).to.emit(lock, "Withdrawal").withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
    //   });
    // });

    // describe("Transfers", function () {
    //   it("Should transfer the funds to the owner", async function () {
    //     const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
    //       deployOneYearLockFixture
    //     );

    //     await time.increaseTo(unlockTime);

    //     await expect(lock.withdraw()).to.changeEtherBalances(
    //       [owner, lock],
    //       [lockedAmount, -lockedAmount]
    //     );
    //   });
    // });
  });
});
