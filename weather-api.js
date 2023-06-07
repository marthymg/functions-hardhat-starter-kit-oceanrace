// This example shows how to make a call to an open API (no authentication required)
// to retrieve asset price from a symbol(e.g., ETH) to another symbol (e.g., USD)

// Open-Meteo API curl https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true

// Refer to https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below
const position = args[0]
const direction = args[1]
const address = args[2]

console.log(`contract direction: ${direction}`)
console.log(`contract position: ${position}`)
console.log(`contract address: ${address}`)

//Position data - latitude/longitude
//let positionClean = position.replaceAll('\x00','');
//args: ['{"lat":"53.54","lon":"10.00", "wspeed":"16.7", "wdir":"71", "time":1684133326419}' , '{"lat":"52.36","lon":"4.91"}'],
//const _direction = "{'lat':'52.36','lon':'4.91'}";
//const replaced = _direction.replaceAll("'", '"');
const directionObj = JSON.parse(direction.replaceAll("'", '"'))
const positionObj = JSON.parse(position.replaceAll("'", '"'))

const { newPositionLatitude, newPositionLongitude } = getNewPosition(positionObj, directionObj)

console.log(newPositionLatitude)
console.log(newPositionLongitude)

// make HTTP request
const url = `https://api.open-meteo.com/v1/forecast`
console.log(
  `HTTP GET Request to ${url}?fsyms=${newPositionLatitude.toFixed(2)}&tsyms=${newPositionLongitude.toFixed(
    2
  )}&current_weather=true`
)

// construct the HTTP Request object. See: https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code
// params used for URL query parameters
// Example of query: https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true
const cryptoCompareRequest = Functions.makeHttpRequest({
  url: url,
  params: {
    latitude: newPositionLatitude.toFixed(2),
    longitude: newPositionLongitude.toFixed(2),
    current_weather: true,
  },
})

// Execute the API request (Promise)
const cryptoCompareResponse = await cryptoCompareRequest
if (cryptoCompareResponse.error) {
  console.error(cryptoCompareResponse.error)
  throw Error("Request failed")
}

const data = cryptoCompareResponse["data"]
if (data.Response === "Error") {
  console.error(data.Message)
  throw Error(`Functional error. Read message: ${data.Message}`)
}

// weather data
const wspeed = data["current_weather"]["windspeed"]
const wdirection = data["current_weather"]["winddirection"]

//console.log(`${fromSymbol} price is: ${price.toFixed(2)} ${toSymbol}`)
console.log(`weather windspeed: ${wspeed}`)
console.log(`weather winddirection: ${wdirection}`)

// The final result is a JSON object

const result = {
  lat: newPositionLatitude.toFixed(2),
  lon: newPositionLongitude.toFixed(2),
  wsp: wspeed,
  wdi: wdirection,
  time: Date.now(),
}

console.log(JSON.stringify(result).replaceAll('"', "'"))

return Buffer.concat([Functions.encodeString(JSON.stringify(result).replaceAll('"', "'"))])

//return Buffer.concat([Functions.encodeString(JSON.stringify(result).replaceAll('"', "'")), Functions.encodeString(address)])

// Solidity doesn't support decimals so multiply by 100 and round to the nearest integer
// Use Functions.encodeUint256 to encode an unsigned integer to a Buffer
//return Functions.encodeUint256(Math.round(weather * 100))

// heary math for moving the boats on the ocean

function getNewPosition(objP1, objP2) {
  // φ1,λ1 is the start point, φ2,λ2 the end point (Δλ is the difference in longitude)
  //const p1 = new LatLon(52.205, 0.119);
  //const p2 = new LatLon(48.857, 2.351);
  //const b1 = p1.initialBearingTo(p2); // 156.2°

  //const p1 = [53.54, 10.00]; // 53.54768446553057, 10.001037465109329 - Hamburg
  const p1 = [objP1.lat, objP1.lon]
  //const p2 = [52.36, 4.91]; // 52.36336348722051, 4.91363157593432 - Amsterdam
  const p2 = [objP2.lat, objP2.lon]

  const R = 6371e3 // metres
  const φ1 = (p1[0] * Math.PI) / 180 // φ, λ in radians
  const φ2 = (p2[0] * Math.PI) / 180
  const λ1 = (p1[1] * Math.PI) / 180
  const Δφ = ((p2[0] - p1[0]) * Math.PI) / 180
  const Δλ = ((p2[1] - p1[1]) * Math.PI) / 180

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  const brng = ((θ * 180) / Math.PI + 360) % 360 // in degrees

  console.log(`brng: ${brng}`)

  // distance traveled as a function of wind speed, course to the wind and hull speed of the sailboat
  const d = getDistance(brng, objP1.wsp, objP1.wdi, objP1.time)

  // for debugging it is sometimes helpfull to have a motorboat ;-)
  //const d = 60000;

  const _brng = (Number(brng) * Math.PI) / 180

  const φ3 = Math.asin(Math.sin(φ1) * Math.cos(d / R) + Math.cos(φ1) * Math.sin(d / R) * Math.cos(_brng))
  const λ3 =
    λ1 + Math.atan2(Math.sin(_brng) * Math.sin(d / R) * Math.cos(φ1), Math.cos(d / R) - Math.sin(φ1) * Math.sin(φ3))

  //The longitude can be normalised to −180…+180 using (lon+540)%360-180

  const newPositionLatitude = ((φ3 * 180) / Math.PI + 360) % 360 // in degrees
  const newPositionLongitude = ((λ3 * 180) / Math.PI + 360) % 360 // in degrees

  //console.log(`new position: ${_φ3} : ${_λ3}`);
  return { newPositionLatitude, newPositionLongitude }
}

function getBearing() {
  // φ1,λ1 is the start point, φ2,λ2 the end point (Δλ is the difference in longitude)
  //const p1 = new LatLon(52.205, 0.119);
  //const p2 = new LatLon(48.857, 2.351);
  //const b1 = p1.initialBearingTo(p2); // 156.2°

  const p1 = [53.54, 10.0] // 53.54768446553057, 10.001037465109329 - Hamburg
  const p2 = [52.36, 4.91] // 52.36336348722051, 4.91363157593432 - Amsterdam

  const R = 6371e3 // metres
  const φ1 = (p1[0] * Math.PI) / 180 // φ, λ in radians
  const φ2 = (p2[0] * Math.PI) / 180
  const λ1 = (p1[1] * Math.PI) / 180
  const Δφ = ((p2[0] - p1[0]) * Math.PI) / 180
  const Δλ = ((p2[1] - p1[1]) * Math.PI) / 180

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  const brng = ((θ * 180) / Math.PI + 360) % 360 // in degrees

  console.log(`brng: ${brng}`)
  return brng
}

function getDistance(brng, wsp, wdi, time) {
  // we are working with 8.1 knots hull speed -> 15000 meter/h / fastest speed digit of the boat
  hull_speed = 15000
  // bearing
  console.log(`brng: ${brng}`)
  // windspped
  console.log(`wsp: ${wsp}`)
  // winddirection
  console.log(`wdi: ${wdi}`)
  // time since last postion calculation
  console.log(`time: ${time}`)

  const _wAngle = Math.abs(windAngle(wdi, brng))
  // time since last postion calculation
  console.log(`_wAngle: ${Math.abs(_wAngle)}`)

  const _factorSC = factorSailingCourse(_wAngle)
  console.log(`_factorSC: ${_factorSC}`)

  const _factorWS = factorWindSpeed(wsp)
  console.log(`_factorWS: ${_factorWS}`)

  let distance = hull_speed * _factorSC * _factorWS
  console.log(`distance: ${distance}`)

  // time between last calculation in hours
  const timeDelta = (Date.now() - time) / 3600000
  console.log(`timeDelta: ${timeDelta}`)
  console.log(`Date.now(): ${Date.now()}`)

  // time on this course with the assumption weatherconditions stay
  distance = distance * timeDelta
  console.log(`distance: ${distance}`)

  //distance = 30000;
  return distance
}

//angle between winddirection and bearing
function windAngle(wd, brn) {
  let wAngle = wd - brn
  if (wAngle > 180) {
    wAngle = wAngle - 360
  }
  if (wAngle < -180) {
    wAngle = wAngle + 360
  }
  return wAngle
}

// windAngle has impact on the speed of the boat
// you cannot sail against the wind 325< windAngle <35
function factorSailingCourse(wa) {
  let factor = 0
  if (wa > 35 && wa < 80) {
    // close to the wind 35 - 80
    return (factor = 0.8)
  }
  if (wa > 80 && wa < 105) {
    // half wind 80 - 105
    return (factor = 1)
  }
  if (wa > 105 && wa < 150) {
    // clear wind 105 - 150
    return (factor = 1)
  }
  if (wa > 150 && wa < 180) {
    // aft wind 150 - 180
    return (factor = 0.8)
  }
  return factor
}

// fastest speed () only with sufficient windspeed
// windspeed > 75 km/h to much wind for sailing
function factorWindSpeed(ws) {
  let factor = 0
  if (ws > 2 && ws < 11) {
    //
    return (factor = 0.33)
  }
  if (ws > 12 && ws < 19) {
    //
    return (factor = 0.66)
  }
  if (ws > 20 && ws < 50) {
    //
    return (factor = 1)
  }
  if (ws > 50 && ws < 75) {
    //
    return (factor = 0.66)
  }
  return factor
}

function checkValidePosition() {
  return true
}

Footer
