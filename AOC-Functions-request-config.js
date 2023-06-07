const fs = require("fs")

// Loads environment variables from .env.enc file (if it exists)
require("@chainlink/env-enc").config()

const Location = {
  Inline: 0,
  Remote: 1,
}

const CodeLanguage = {
  JavaScript: 0,
}

const ReturnType = {
  uint: "uint256",
  uint256: "uint256",
  int: "int256",
  int256: "int256",
  string: "string",
  bytes: "Buffer",
  Buffer: "Buffer",
}

// Configure the request by setting the fields below
const requestConfig = {
  // Location of source code (only Inline is currently supported)
  codeLocation: Location.Inline,
  // Code language (only JavaScript is currently supported)
  codeLanguage: CodeLanguage.JavaScript,
  // String containing the source code to be executed
  source: fs.readFileSync("./weather-api.js").toString(),
  //source: fs.readFileSync('./API-request-example.js').toString(),
  // Secrets can be accessed within the source code with `secrets.varName` (ie: secrets.apiKey). The secrets object can only contain string values.
  //secrets: { apiKey: process.env.COINMARKETCAP_API_KEY ?? "" },
  // Per-node secrets objects assigned to each DON member. When using per-node secrets, nodes can only use secrets which they have been assigned.
  perNodeSecrets: [],
  // ETH wallet key used to sign secrets so they cannot be accessed by a 3rd party
  walletPrivateKey: process.env["PRIVATE_KEY"],
  // Args (string only array) can be accessed within the source code with `args[index]` (ie: args[0]).
  //args: ["1", "bitcoin", "btc-bitcoin", "btc", "1000000", "450"],
  //args: ["ETH", "USD"],
  //  53.54768446553057, 10.001037465109329 - Hamburg
  //  52.36336348722051, 4.91363157593432 - Amsterdam
  // {"lat":53.43478637942582,"lng":8.282833862304706}
  args: ["{'lat':'53.54','lon':'10.00','wsp':5.9,'wdi':284,'time':1685879784380}", "{'lat':54.73,'lon':8.65}"],
  // Expected type of the returned value
  //expectedReturnType: ReturnType.uint256,
  expectedReturnType: ReturnType.string,
  // Redundant URLs which point to encrypted off-chain secrets
  secretsURLs: [],
}

module.exports = requestConfig
