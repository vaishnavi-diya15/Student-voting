const { expect } = require("chai");
const { ethers } = require("hardhat");

// Placeholder test so `npm test` verifies the toolchain in Phase 1.
// Voting contract tests are added in a later phase.
describe("Hardhat setup", function () {
  it("provides local test accounts through ethers.js", async function () {
    const signers = await ethers.getSigners();
    expect(signers.length).to.be.greaterThan(0);
  });
});
