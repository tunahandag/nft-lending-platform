import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ONE_MONTH_IN_SECS = 24 * 60 * 60;
const INTEREST_RATE = 500; // 5% in basis points

const NFTLending = buildModule("NFTLending", (m) => {
  const loanDuration = m.getParameter("loanDuration", ONE_MONTH_IN_SECS);
  const interestRate = m.getParameter("interestRate", INTEREST_RATE);

  const nftLending = m.contract("NFTLending", [loanDuration, interestRate]);

  return { nftLending };
});

export default NFTLending;
