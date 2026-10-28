function add(a, b) { 
    return a + b; 
}
function subtract(a, b) {
    return a - b;
}
function multiply(a, b) {
    return a * b;
}
function divide(a, b) {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
}
function isValidUsername(username) {
  if (typeof username !== 'string') {
    throw new TypeError('Username must be a string');
  }

  return username.trim().length >= 3;
}
function calculateDiscount(price, customerType) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    throw new Error('Invalid price');
  }

  if (customerType === 'premium') {
    return price * 0.8;
  }

  if (customerType === 'member') {
    return price * 0.9;
  }

  return price;
}
function getAverage(numbers) {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new Error('Expected a non-empty array');
  }

  if (!numbers.every(Number.isFinite)) {
    throw new TypeError('All elements must be finite numbers');
  }

  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}
function calculateOrderTotal(items, isPremium) {
  if (!Array.isArray(items)) {
    throw new TypeError('Items must be an array');
  }

  const subtotal = items.reduce((sum, item) => {
    if (
      !item ||
      typeof item.price !== 'number' ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw new Error('Invalid item');
    }

    return sum + item.price * item.quantity;
  }, 0);

  const discounted = isPremium ? subtotal * 0.9 : subtotal;

  return Number(discounted.toFixed(2));
}