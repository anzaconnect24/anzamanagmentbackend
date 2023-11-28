const axios = require('axios');
const circularJSON = require('circular-json');
require('dotenv').config(); 

// Function to remove HTML tags from a string
const removeHtmlTags = (input) => {
  return input.replace(/<\/?[^>]+(>|$)/g, '');
};

const sendSMS = async (numbers, message) => {
  try {
    // Remove HTML tags from the message
    const cleanedMessage = removeHtmlTags(message);
     console.log(cleanedMessage)
    const data = JSON.stringify({
      "from": "RMNDR",
      "to": numbers,
      "text": cleanedMessage  // Use the cleaned message
    });
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://messaging-service.co.tz/api/sms/v1/text/single',
      headers: { 
        'Authorization': process.env.SMS_AUTH, 
        'Content-Type': 'application/json', 
        'Accept': 'application/json'
      },
      data: data
    };
    const response = await axios(config);
   
    // Convert the response data to a string, handling circular references
    const jsonString = circularJSON.stringify(response.data);
    console.log(jsonString)
    return jsonString;
  } catch (error) {
    console.log(error);
    return error;
  }
};

module.exports = sendSMS;
