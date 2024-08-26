import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const name: string = "MockNFT";
const symbol: string = "MCK";
const baseUri: string = "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/";

const MockNFT = buildModule("MockNFT", (m) => {
  const nftName = m.getParameter("nftName", name);
  const nftSymbol = m.getParameter("nftSymbol", symbol);
  const nftBaseUri = m.getParameter("nftBaseUri", baseUri);

  const mockNFT = m.contract("MockNFT", [nftName, nftSymbol, nftBaseUri]);

  return { mockNFT };
});

export default MockNFT;
