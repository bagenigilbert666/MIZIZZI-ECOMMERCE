module.exports = {
  content: [
    "./frontend/**/*.{js,ts,jsx,tsx}",
    // ...existing content globs if any...
  ],
  theme: {
    extend: {
      // ...existing theme extensions...
    },
  },
  // Keep arbitrary delay values safe so warnings about ambiguous classes are less likely
  safelist: [
    // matches delay-[400ms], delay-[600ms], delay-[150ms], delay-[0.2s], etc.
    { pattern: /^delay-\[.*(?:ms|s)\]$/ },
  ],
  plugins: [
    // ...existing plugins...
  ],
}
