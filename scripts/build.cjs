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
    "premium.css",
  ]
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n");
  const css = new CleanCSS({ level: 1, rebase: false }).minify(styles);
  if (css.errors.length) throw Error(css.errors.join("\n"));
  fs.writeFileSync("site.min.css", css.styles + "\n");
  const scripts = ["app.js", "features.js", "advanced.js", "site.js", "premium.js"]
    .map((f) => fs.readFileSync(f, "utf8"))
    .join("\n;\n") + ";\nwindow.MAMSSLoading?.check(\"tools\");";
  const js = await terser.minify(scripts, {
    compress: { passes: 2 },
    mangle: false,
    keep_fnames: true,
    format: { comments: false },
  });
  fs.writeFileSync("site.min.js", js.code + "\n");
  const loadingCSS = new CleanCSS({ level: 1, rebase: false }).minify(fs.readFileSync("loading.css", "utf8"));
  if (loadingCSS.errors.length) throw Error(loadingCSS.errors.join("\n"));
  const loadingJS = await terser.minify(fs.readFileSync("loading.js", "utf8"), { compress: true, mangle: true });
  if (!loadingJS.code) throw Error("Loading controller did not build");
  const markup = fs.readFileSync("loading.html", "utf8").trim();
  let html = fs.readFileSync("index.html", "utf8");
  const headMarker = /<!-- MAMSS LOADING HEAD -->[\s\S]*?<!-- \/MAMSS LOADING HEAD -->/;
  const bodyMarker = /<!-- MAMSS LOADING SCREEN -->[\s\S]*?<!-- \/MAMSS LOADING SCREEN -->/;
  if (!headMarker.test(html) || !bodyMarker.test(html)) throw Error("Loading screen build markers are missing");
  html = html.replace(headMarker, () => `<!-- MAMSS LOADING HEAD -->\n<style id="mamss-loading-style">${loadingCSS.styles}</style>\n<!-- /MAMSS LOADING HEAD -->`)
    .replace(bodyMarker, () => `<!-- MAMSS LOADING SCREEN -->\n${markup}\n<script>${loadingJS.code}</script>\n<!-- /MAMSS LOADING SCREEN -->`);
  fs.writeFileSync("index.html", html);
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
