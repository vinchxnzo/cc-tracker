import fs from "fs";

try {
  fs.copyFileSync("dist/index.html", "dist/404.html");
  console.log("Copied index.html to 404.html ✅");
} catch (e) {
  console.error("Failed to copy 404.html", e);
}
