// src/utils/colors.js
// ANSI escape codes for cross-platform colored terminal output (zero dependencies)

const isColorSupported = !process.env.NO_COLOR && (process.stdout.isTTY || process.env.CI);

const color = (open, close) => (str) =>
  isColorSupported ? `\x1b[${open}m${str}\x1b[${close}m` : String(str);

module.exports = {
  bold: color(1, 22),
  dim: color(2, 22),
  red: color(31, 39),
  green: color(32, 39),
  yellow: color(33, 39),
  blue: color(34, 39),
  magenta: color(35, 39),
  cyan: color(36, 39),
  white: color(37, 39),
};
