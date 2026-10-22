import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
for (const page of process.argv.slice(2)) {
  const html = readFileSync(`${page}.html`, 'utf8')
  const m = html.match(/<script id="tailwind-config">\s*tailwind\.config = (\{[\s\S]*?\n\s*\})\s*<\/script>/)
  if (!m) throw new Error(`no config in ${page}`)
  writeFileSync(`tw.${page}.config.cjs`, `const base = ${m[1]}\nmodule.exports = { darkMode: base.darkMode, content: ['./${page}.html'], theme: base.theme, plugins: [require('@tailwindcss/forms'), require('@tailwindcss/container-queries')] }\n`)
  writeFileSync('in.css', '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n')
  execFileSync('./node_modules/.bin/tailwindcss', ['-c', `tw.${page}.config.cjs`, '-i', 'in.css', '-o', `out.${page}.css`], { stdio: 'inherit' })
  const css = readFileSync(`out.${page}.css`, 'utf8')
  writeFileSync(`shim.${page}.js`, `window.tailwind=window.tailwind||{};(function(){var s=document.createElement('style');s.setAttribute('data-qa-tailwind','1');s.textContent=${JSON.stringify(css)};document.head.appendChild(s)})();`)
  console.log(page, css.length)
}
