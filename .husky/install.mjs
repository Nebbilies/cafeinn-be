if (
  process.env.NODE_ENV === 'production' ||
  process.env.CI === 'true' ||
  process.env.HUSKY === '0'
) {
  process.exit(0);
}

const { default: husky } = await import('husky');
console.log(husky());
