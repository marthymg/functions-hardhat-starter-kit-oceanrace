const { latest } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time")
const { getDecodedResultLog } = require("../../FunctionsSandboxLibrary")

task(
  "functions-read",
  "Reads the latest response (or error) returned to a FunctionsConsumer or AutomatedFunctionsConsumer client contract"
)
  .addParam("contract", "Address of the client contract to read")
  .setAction(async (taskArgs) => {
    if (network.name === "hardhat") {
      throw Error(
        'This command cannot be used on a local hardhat chain.  Specify a valid network or simulate an FunctionsConsumer request locally with "npx hardhat functions-simulate".'
      )
    }

    console.log(`Reading data from Functions client contract ${taskArgs.contract} on network ${network.name}`)
    const clientContractFactory = await ethers.getContractFactory("OceanRace")
    const clientContract = await clientContractFactory.attach(taskArgs.contract)

    let latestError = await clientContract.latestError()
    if (latestError.length > 0 && latestError !== "0x") {
      const errorString = Buffer.from(latestError.slice(2), "hex").toString()
      console.log(`\nOn-chain error message: ${Buffer.from(latestError.slice(2), "hex").toString()}`)
    }
    // Check new Position
    const _adress = await clientContract.address
    console.log(`\nAddress: ${_adress}`)

    //console.log(_deployTransaction)
    const playerAddress = await clientContract.players(0)
    console.log(`\nPlayer 1: ${playerAddress}`)

    //Filter
    const events = await clientContract.queryFilter("OCRResponse", -100000, "latest")
    console.log(`\nEvent 1: ${events[0].args}`)

    const position = await clientContract.position(playerAddress)
    console.log(`\nPosition 1: ${position}`)

    const direction = await clientContract.direction(playerAddress)
    console.log(`\nDirection 1: ${direction}`)

    let latestResponse = await clientContract.latestResponse()
    console.log(latestResponse)
    if (latestResponse.length > 0 && latestResponse !== "0x") {
      const requestConfig = require("../../Functions-request-config")
      console.log(
        `\nOn-chain response represented as a hex string: ${latestResponse}\n${getDecodedResultLog(
          requestConfig,
          latestResponse
        )}`
      )
    }
  })
