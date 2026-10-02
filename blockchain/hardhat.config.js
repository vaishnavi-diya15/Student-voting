require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    // Built-in in-memory network used by `npm test`. Free, no real money.
    hardhat: {},
    // Local development chain started with `npm run node`.
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};
// Only local networks are configured on purpose: no mainnet, no private keys.
