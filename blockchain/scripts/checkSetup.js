// Confirms Hardhat and ethers.js work. Run with: npm run check
const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const block = await hre.ethers.provider.getBlockNumber();
  console.log(`Network: ${hre.network.name}`);
  console.log(`Test accounts available: ${signers.length}`);
  console.log(`Current block number: ${block}`);
  console.log("Hardhat setup OK. Voting contract is added in a later phase.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
