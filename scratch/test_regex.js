const regexStr = '^\\+?[0-9]{10,15}$';
const regex = new RegExp(regexStr);
const value = '+919876543210';
console.log(`Testing "${value}" against /${regexStr}/`);
console.log(`Match: ${regex.test(value)}`);
console.log(`Length of digits: ${value.replace('+', '').length}`);
