// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import {Functions, FunctionsClient} from "./dev/functions/FunctionsClient.sol";
// import "@chainlink/contracts/src/v0.8/dev/functions/FunctionsClient.sol"; // Once published
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

//import "./dev/functions/strings.sol";

/**
 * @title Ocean Race contract
 * @notice This contract is a demonstration of using Functions.
 * @notice NOT FOR PRODUCTION USE
 */
contract OceanRace is FunctionsClient, ConfirmedOwner {
  using Functions for Functions.Request;

  //using strings for *;

  bytes32 public latestRequestId;
  bytes public latestResponse;
  bytes public latestError;

  address[] public players;
  string public raceStart;
  uint256[2] public raceFinish;

  mapping(address => string) public position;
  mapping(address => string) public direction;

  event OCRResponse(bytes32 indexed requestId, bytes result, bytes err);

  /**
   * @notice Executes once when a contract is created to initialize state variables
   *
   * @param oracle - The FunctionsOracle contract
   */
  // https://github.com/protofire/solhint/issues/242
  // solhint-disable-next-line no-empty-blocks
  constructor(address oracle) FunctionsClient(oracle) ConfirmedOwner(msg.sender) {
    // Setup race
    // Skipper
    players.push(0x9745fbfeCE314C2C9D4817e636Bc174236371Eb8);

    // Start [latitude, longitude]
    raceStart = "{'lat':'53.54','lon':'10.00', 'wsp':'16.7', 'wdi':'71', 'time':1684133326419}";

    // all boats start from raceStart
    for (uint i = 0; i <= players.length - 1; i++) {
      updatePosition(players[i], raceStart);
      // set a default direction
      setInitialDirection(players[i], "{'lat':'52.36','lon':'4.91'}");
    }
  }

  /**
   * @notice Send a simple request
   *
   * @param source JavaScript source code
   * @param secrets Encrypted secrets payload
   * @param args List of arguments accessible from within the source code
   * @param subscriptionId Funtions billing subscription ID
   * @param gasLimit Maximum amount of gas used to call the client contract's `handleOracleFulfillment` function
   * @return Functions request ID
   */
  function executeRequest(
    string calldata source,
    bytes calldata secrets,
    string[] calldata args,
    uint64 subscriptionId,
    uint32 gasLimit
  ) public onlyOwner returns (bytes32) {
    Functions.Request memory req;
    req.initializeRequest(Functions.Location.Inline, Functions.CodeLanguage.JavaScript, source);
    if (secrets.length > 0) {
      req.addRemoteSecrets(secrets);
    }

    //if (args.length > 0) req.addArgs(args);

    string memory args1 = position[players[0]];
    string memory args2 = direction[players[0]];
    string[] memory _args = new string[](3);
    _args[0] = args1;
    _args[1] = args2;
    //_args[2] = args[2]; //address
    req.addArgs(_args);

    bytes32 assignedReqID = sendRequest(req, subscriptionId, gasLimit);
    latestRequestId = assignedReqID;
    return assignedReqID;
  }

  /**
   * @notice Callback that is invoked once the DON has resolved the request or hit an error
   *
   * @param requestId The request ID, returned by sendRequest()
   * @param response Aggregated response from the user code
   * @param err Aggregated error from the user code or from the execution pipeline
   * Either response or error parameter will be set, but never both
   */
  function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override {
    latestResponse = response;
    latestError = err;
    emit OCRResponse(requestId, response, err);

    // fullfill OceanRace
    bool nilErr = (err.length == 0);
    if (nilErr) {
      //(int256 latestListenerCount, string memory result) = abi.decode(response, (int256, string));

      string memory result = string(response);

      updatePosition(players[0], result);
    }
  }

  /**
   * @notice Allows the Functions oracle address to be updated
   *
   * @param oracle New oracle address
   */
  function updateOracleAddress(address oracle) public onlyOwner {
    setOracle(oracle);
  }

  function addSimulatedRequestId(address oracleAddress, bytes32 requestId) public onlyOwner {
    addExternalRequest(oracleAddress, requestId);
  }

  // Ocean Race Stuff
  function updatePosition(address _player, string memory newPosition) public {
    require(_player == players[0], "In the showcase there is just one boat runnig !");
    position[_player] = newPosition;
  }

  function setDirection(string memory newDirection) public {
    require(msg.sender == players[0], "In the showcase there is just one boat runnig !");
    direction[msg.sender] = newDirection;
  }

  function setInitialDirection(address _player, string memory newDirection) public onlyOwner {
    direction[_player] = newDirection;
  }

  // unit

  function strToUint(string memory _str) public pure returns (uint256 res) {
    for (uint256 i = 0; i < bytes(_str).length; i++) {
      if ((uint8(bytes(_str)[i]) - 48) < 0 || (uint8(bytes(_str)[i]) - 48) > 9) {
        return (0);
      }
      res += (uint8(bytes(_str)[i]) - 48) * 10 ** (bytes(_str).length - i - 1);
    }

    return (res);
  }
}
