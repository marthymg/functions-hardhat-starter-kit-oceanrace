const { expect } = require("chai")

describe("OceanRace contract", function () {
  it("OceanRace tests", async function () {
    const [owner] = await ethers.getSigners()

    // Deploy a mock oracle & registry contract to simulate a fulfillment
    const { oracle, registry, linkToken } = await deployMockOracle()

    const oceanRace = await ethers.getContractFactory("OceanRace")

    const hardhatOceanRace = await oceanRace.deploy(oracle.address)

    const playerAddress = await hardhatOceanRace.players(0)
    console.log(`\nPlayer 1: ${playerAddress}`)

    // expect(ownerBalance == '0x9745fbfeCE314C2C9D4817e636Bc174236371Eb8');
    expect(await hardhatOceanRace.players(0)).to.equal("0x9745fbfeCE314C2C9D4817e636Bc174236371Eb8")

    const position = await hardhatOceanRace.position(playerAddress, 0)
    //const position = await hardhatOceanRace.raceStart(0);
    console.log(`\nPosition 1: ${position}`)

    await hardhatOceanRace.setDirection([5353, 1313])
    const direction = await hardhatOceanRace.direction(playerAddress, 0)
    console.log(`\nDirection 1: ${direction}`)
  })

  const deployMockOracle = async () => {
    // Deploy mocks: LINK token & LINK/ETH price feed
    const { networks, SHARED_DON_PUBLIC_KEY } = require("../../networks")

    const linkTokenFactory = await ethers.getContractFactory("LinkToken")
    const linkPriceFeedFactory = await ethers.getContractFactory("MockV3Aggregator")
    const linkToken = await linkTokenFactory.deploy()
    const linkPriceFeed = await linkPriceFeedFactory.deploy(0, ethers.BigNumber.from(5021530000000000))
    // Deploy proxy admin
    await upgrades.deployProxyAdmin()
    // Deploy the oracle contract
    const oracleFactory = await ethers.getContractFactory("contracts/dev/functions/FunctionsOracle.sol:FunctionsOracle")
    const oracleProxy = await upgrades.deployProxy(oracleFactory, [], {
      kind: "transparent",
    })
    await oracleProxy.deployTransaction.wait(1)
    // Set the secrets encryption public DON key in the mock oracle contract
    await oracleProxy.setDONPublicKey("0x" + SHARED_DON_PUBLIC_KEY)
    // Deploy the mock registry billing contract
    const registryFactory = await ethers.getContractFactory(
      "contracts/dev/functions/FunctionsBillingRegistry.sol:FunctionsBillingRegistry"
    )
    const registryProxy = await upgrades.deployProxy(
      registryFactory,
      [linkToken.address, linkPriceFeed.address, oracleProxy.address],
      {
        kind: "transparent",
      }
    )
    await registryProxy.deployTransaction.wait(1)
    // Set registry configuration
    const config = {
      maxGasLimit: 300_000,
      stalenessSeconds: 86_400,
      gasAfterPaymentCalculation: 39_173,
      weiPerUnitLink: ethers.BigNumber.from("5000000000000000"),
      gasOverhead: 519_719,
      requestTimeoutSeconds: 300,
    }
    await registryProxy.setConfig(
      config.maxGasLimit,
      config.stalenessSeconds,
      config.gasAfterPaymentCalculation,
      config.weiPerUnitLink,
      config.gasOverhead,
      config.requestTimeoutSeconds
    )
    // Set the current account as an authorized sender in the mock registry to allow for simulated local fulfillments
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    await registryProxy.setAuthorizedSenders([oracleProxy.address, deployer.address])
    await oracleProxy.setRegistry(registryProxy.address)
    return { oracle: oracleProxy, registry: registryProxy, linkToken }
  }
})
