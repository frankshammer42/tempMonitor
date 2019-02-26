const mcpadc = require('mcp-spi-adc');  // include the MCP SPI library const sampleRate = { speedHz: 20000 };  // ADC sample rate
const axios = require('axios'); 
const Gpio = require('onoff').Gpio;
let device = {};      // object for device characteristics const Gpio = require('onoff').Gpio; // include onoff library
const sampleRate = { speedHz: 20000 };
let channels = [];    // list for ADC channels 
// open two ADC channels and push them to the channels list:
let tempSensor = mcpadc.open(0, sampleRate, addNewChannel);
channels.push(tempSensor);
let potentiometer = mcpadc.open(2, sampleRate, addNewChannel);
channels.push(potentiometer);
//control lights
let led = new Gpio(17, 'out');
let ledState = 0;
let switch_counter = 0;


// callback for open() commands. Doesn't do anything here:
function addNewChannel(error) {
  if (error) throw error;
}

// function to read and convert sensors:
function checkSensors() {
  // callback function for tempSensor.read():
  function getTemperature(error, reading) {
    if (error) throw error;
    // range is 0-1. Convert to Celsius (see TMP36 data sheet for details)
    device.temperature = (reading.value * 3.3 - 0.5) * 100;
	  //if (device.temperature < 40 && device.temperature > 0){
		  //console.log(device.temperature);
	  //}
  }
  
  // callback function for potentiometer.read():
  function getKnob(error, reading) {
    if (error) throw error;
    device.potentiometer = reading.value;
	  //if (device.potentiometer != 0){
		  //console.log(device.potentiometer);
	  //} 
  }

  // make sure there are two ADC channels open to read,
  // then read them and print the result:
  if (channels.length > 1) {
    tempSensor.read(getTemperature);
    potentiometer.read(getKnob);
	postData(device);
	switchLight(device);
  }
}

function switchLight(device){
	let current_roter_reading = device.potentiometer;
	let mapped_temperature = getMappedTemperature(current_roter_reading);
	console.log(mapped_temperature);
	console.log(device.temperature);
	if (mapped_temperature > device.temperature){
		ledState = 1;
	}
	else{
		ledState = 0;
	}
	led.writeSync(ledState);
}

function postData(device){
	if (device.temperature <= 40 && device.temperature >= 0){
		let tempObj = {"temperature":device.temperature};
		let jsonString = JSON.stringify(tempObj);
		axios.post('https://tigoe.io/data', {
			macAddress: 'b8:27:eb:d3:ef:0f',
			sessionKey: 'bc3e8860-5eb8-4554-af1d-16aee0d01b4f',
			data: jsonString
		})
		.then((res) => {
		  //console.log(`statusCode: ${res.statusCode}`)
		  console.log("status code:" + res.status);
		})
		.catch((error) => {
		  console.error(error);
		})
	}
}

function test(){
	axios.get('https://tigoe.io/data', {
	  params: {
		macAddress: 'b8:27:eb:d3:ef:0f',
		sessionKey: 'bc3e8860-5eb8-4554-af1d-16aee0d01b4f',
	  }
	})
	.then((res) => {
	  //console.log(`statusCode: ${res.statusCode}`)
	  console.log(res);
	})
	.catch((error) => {
	  console.error(error);
	})
}

function scale(num, in_min, in_max, out_min, out_max){
  return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function getMappedTemperature(roter_value){
	let temperature_value = scale(roter_value, 0, 1, 0, 40);
	return temperature_value;
}

// set an interval once a second to read the sensors:
setInterval(checkSensors, 1000);
