module.exports = {
  ci: {
    collect: {
      url: ["https://merebari7-web.github.io/mamss-website/"],
      numberOfRuns: 2,
      settings: { chromeFlags: "--no-sandbox --headless" },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
      },
    },
    upload: { target: "filesystem", outputDir: "lighthouse-reports" },
  },
};
