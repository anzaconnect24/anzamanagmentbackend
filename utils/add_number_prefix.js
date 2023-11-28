const  addPrefixToPhoneNumber = (phoneNumber)=> {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  if (digitsOnly.startsWith('0')) {
    return `255${digitsOnly.slice(1)}`;
  } else {
    return digitsOnly;
  }
  }
  
  module.exports = addPrefixToPhoneNumber