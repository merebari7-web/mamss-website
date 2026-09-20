/* Deterministic, dependency-free runtime bundles. Authored sources stay editable. */
const fs = require("node:fs"),
  CleanCSS = require("clean-css"),
  terser = require("terser");
(async () => {
  const styles = [
    "fonts.css",
    "styles.css",
    "features.css",
    "advanced.css",
    "site.css",
  ]
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n");
  const css = new CleanCSS({ level: 1, rebase: false }).minify(styles);
  if (css.errors.length) throw Error(css.errors.join("\n"));
  fs.writeFileSync("site.min.css", css.styles + "\n");
  const scripts = ["app.js", "features.js", "advanced.js", "site.js"]
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n;\n");
  const js = await terser.minify(scripts, {
    compress: { passes: 2 },
    mangle: false,
    keep_fnames: true,
    format: { comments: false },
  });
  fs.writeFileSync("site.min.js", js.code + "\n");
  console.log(
    "Built CSS",
    Buffer.byteLength(css.styles),
    "bytes; JS",
    Buffer.byteLength(js.code),
    "bytes",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
