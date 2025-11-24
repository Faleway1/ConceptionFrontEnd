import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIGHTEN_STRENGTH = 0.18;
const DARKEN_STRENGTH = 0.18;

function parseUnit(value) {
  const match = String(value).match(/([0-9.]+)([a-z%]+)/);
  return match ? { number: parseFloat(match[1]), unit: match[2] } : { number: 0, unit: 'px' };
}

function clampChannel(channel) {
  return Math.min(255, Math.max(0, Math.round(channel)));
}

function adjustColor(hex, amount) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const factor = amount >= 0 ? amount : -amount;
  const adjust = (channel) => {
    if (amount >= 0) {
      return clampChannel(channel + (255 - channel) * factor);
    }
    return clampChannel(channel * (1 - factor));
  };

  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);
  return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB)
    .toString(16)
    .slice(1)}`;
}

function generateColorPalette(colors, darkMode) {
  let base = ':root {\n';
  let utilities = '';

  Object.entries(colors).forEach(([name, value]) => {
    const light = adjustColor(value, LIGHTEN_STRENGTH);
    const dark = adjustColor(value, -DARKEN_STRENGTH);
    base += `  --color-${name}: ${value};\n`;
    base += `  --color-${name}-light: ${light};\n`;
    base += `  --color-${name}-dark: ${dark};\n`;

    utilities += `.text-${name} { color: var(--color-${name}); }\n`;
    utilities += `.text-${name}-light { color: var(--color-${name}-light); }\n`;
    utilities += `.text-${name}-dark { color: var(--color-${name}-dark); }\n`;
    utilities += `.bg-${name} { background-color: var(--color-${name}); color: #0f172a; }\n`;
    utilities += `.bg-${name}-light { background-color: var(--color-${name}-light); color: #0f172a; }\n`;
    utilities += `.bg-${name}-dark { background-color: var(--color-${name}-dark); color: #f8fafc; }\n`;
    utilities += `.border-${name} { border-color: var(--color-${name}); }\n`;
  });

  base += '}\n\n';

  let darkRoot = '';
  if (darkMode) {
    darkRoot += '@media (prefers-color-scheme: dark) {\n  :root {\n';
    Object.entries(colors).forEach(([name, value]) => {
      const darker = adjustColor(value, -DARKEN_STRENGTH * 1.2);
      const lifted = adjustColor(value, LIGHTEN_STRENGTH * 0.8);
      darkRoot += `    --color-${name}: ${darker};\n`;
      darkRoot += `    --color-${name}-light: ${lifted};\n`;
      darkRoot += `    --color-${name}-dark: ${adjustColor(darker, -0.08)};\n`;
    });
    darkRoot +=
      '  }\n  body { background-color: #0f172a; color: #e2e8f0; }\n}\n\n';
  }

  return base + utilities + darkRoot;
}

function generateTypography(theme) {
  const { typography, spacing } = theme;
  const lineHeightPercent = parseFloat(spacing?.ratioLineHeight || 1.4) * 100;
  return `body {\n  font-family: ${typography.main};\n  line-height: ${lineHeightPercent}%;\n  color: #0f172a;\n}\n\n` +
    `h1, h2, h3, h4, h5, h6 {\n  font-family: ${typography.headlines};\n  line-height: 120%;\n  margin-bottom: 0.5em;\n}\n`;
}

function generateLayout(theme) {
  const { layout, spacing } = theme;
  const { number: baseNumber, unit: baseUnit } = parseUnit(spacing?.baseUnit || '16px');
  let css = `.container {\n  max-width: ${layout.container};\n  margin: 0 auto;\n  padding: 0 ${baseNumber}${baseUnit};\n}\n\n`;
  css += `.row {\n  display: flex;\n  flex-wrap: wrap;\n  gap: ${baseNumber}${baseUnit};\n}\n\n`;

  for (let i = 1; i <= layout.cols; i += 1) {
    const percentage = ((i / layout.cols) * 100).toFixed(4);
    css += `.col-${i} { flex: 0 0 ${percentage}%; max-width: ${percentage}%; }\n`;
  }
  css += '\n';

  Object.entries(layout.breakpoints).forEach(([prefix, size]) => {
    css += `@media (min-width: ${size}) {\n`;
    for (let i = 1; i <= layout.cols; i += 1) {
      const percentage = ((i / layout.cols) * 100).toFixed(4);
      css += `  .${prefix}\\:col-${i} { flex: 0 0 ${percentage}%; max-width: ${percentage}%; }\n`;
    }
    css += '}\n\n';
  });

  return css;
}

function spacingValue(baseUnit, multiplier) {
  const { number, unit } = parseUnit(baseUnit);
  const raw = number * multiplier;
  const trimmed = Number.isInteger(raw) ? raw : parseFloat(raw.toFixed(3));
  return `${trimmed}${unit}`;
}

function generateSpacingUtilities(theme) {
  const { spacing, layout } = theme;
  const baseUnit = spacing?.baseUnit || '16px';
  const scale = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3];
  const properties = [
    { key: 'm', label: 'margin' },
    { key: 'p', label: 'padding' }
  ];
  const directions = [
    { suffix: '', props: [''] },
    { suffix: 't', props: ['-top'] },
    { suffix: 'b', props: ['-bottom'] },
    { suffix: 'l', props: ['-left'] },
    { suffix: 'r', props: ['-right'] },
    { suffix: 'x', props: ['-left', '-right'] },
    { suffix: 'y', props: ['-top', '-bottom'] }
  ];

  let css = '';
  properties.forEach((property) => {
    directions.forEach((direction) => {
      scale.forEach((step, index) => {
        const value = spacingValue(baseUnit, step);
        const className = `${property.key}${direction.suffix ? `-${direction.suffix}` : ''}-${index}`;
        const rules = direction.props
          .map((suffix) => `${property.label}${suffix}: ${value};`)
          .join(' ');
        css += `.${className} { ${rules} }\n`;

        Object.entries(layout.breakpoints).forEach(([prefix, size]) => {
          css += `@media (min-width: ${size}) { .${prefix}\\:${className} { ${rules} } }\n`;
        });
      });
    });
  });
  css += '\n';
  return css;
}

function generateFlexUtilities(layout) {
  const definitions = {
    flex: 'display: flex;',
    'inline-flex': 'display: inline-flex;',
    'flex-col': 'flex-direction: column;',
    'flex-row': 'flex-direction: row;',
    'flex-wrap': 'flex-wrap: wrap;',
    'items-center': 'align-items: center;',
    'items-start': 'align-items: flex-start;',
    'items-end': 'align-items: flex-end;',
    'justify-center': 'justify-content: center;',
    'justify-between': 'justify-content: space-between;',
    'justify-around': 'justify-content: space-around;',
    grow: 'flex: 1 1 0%;',
    shrink: 'flex: 0 1 auto;'
  };

  let css = '';
  Object.entries(definitions).forEach(([className, rules]) => {
    css += `.${className} { ${rules} }\n`;
  });
  css += '\n';

  Object.entries(layout.breakpoints).forEach(([prefix, size]) => {
    css += `@media (min-width: ${size}) {\n`;
    Object.entries(definitions).forEach(([className, rules]) => {
      css += `  .${prefix}\\:${className} { ${rules} }\n`;
    });
    css += '}\n';
  });

  return css;
}

function generateImageUtilities() {
  return `.img-responsive { display: block; width: 100%; height: auto; }\n.img-cover { width: 100%; height: 100%; object-fit: cover; }\n.img-contain { width: 100%; height: 100%; object-fit: contain; }\n\n`;
}

function generateTransitionUtility(theme) {
  const { duration, type } = theme.transition;
  return `.transition { transition: all ${duration} ${type}; }\n`;
}

function generateComponents(components, theme) {
  const { spacing, transition } = theme;
  const basePadding = spacingValue(spacing.baseUnit, 0.75);
  const baseMargin = spacingValue(spacing.baseUnit, 0.5);
  let css = '';

  if (components.includes('button')) {
    css += `.btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: ${spacingValue(spacing.baseUnit, 0.5)};\n  padding: ${basePadding} ${spacingValue(spacing.baseUnit, 1.25)};\n  border-radius: 9999px;\n  border: 1px solid var(--color-primary);\n  background: var(--color-primary);\n  color: white;\n  font-weight: 600;\n  cursor: pointer;\n  text-decoration: none;\n  transition: background-color ${transition.duration} ${transition.type}, transform ${transition.duration} ${transition.type};\n}\n.btn:hover { transform: translateY(-1px); background: var(--color-primary-dark); }\n.btn:active { transform: translateY(0); }\n.btn-secondary { background: white; color: var(--color-primary); border-color: var(--color-primary); }\n.btn-secondary:hover { background: var(--color-primary-light); color: #0f172a; }\n\n`;
  }

  if (components.includes('card')) {
    css += `.card {\n  background: white;\n  border: 1px solid #e5e7eb;\n  border-radius: 12px;\n  padding: ${spacingValue(spacing.baseUnit, 1.5)};\n  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);\n  transition: box-shadow ${transition.duration} ${transition.type}, transform ${transition.duration} ${transition.type};\n}\n.card:hover { box-shadow: 0 15px 40px rgba(15, 23, 42, 0.12); transform: translateY(-2px); }\n.card + .card { margin-top: ${baseMargin}; }\n\n`;
  }

  if (components.includes('alert')) {
    css += `.alert {\n  padding: ${basePadding};\n  border-radius: 12px;\n  border: 1px solid transparent;\n  display: flex;\n  align-items: center;\n  gap: ${spacingValue(spacing.baseUnit, 0.5)};\n  font-weight: 600;\n}\n`;
    ['primary', 'success', 'warning', 'danger'].forEach((tone) => {
      css += `.alert-${tone} { background: var(--color-${tone}-light); border-color: var(--color-${tone}); color: #0f172a; }\n`;
    });
    css += '\n';
  }

  return css;
}

function generateUtilityCss(config) {
  const { utilities, theme } = config;
  let css = '';
  if (utilities.includes('spacing')) {
    css += generateSpacingUtilities(theme);
  }
  if (utilities.includes('flex')) {
    css += generateFlexUtilities(theme.layout);
  }
  if (utilities.includes('color')) {
    css += Object.keys(theme.colors)
      .map((name) => `.${name}-border { border-color: var(--color-${name}); }\n`) 
      .join('');
  }
  if (utilities.includes('image')) {
    css += generateImageUtilities();
  }
  css += generateTransitionUtility(theme);
  return css;
}

function applyAutoprefix(css) {
  let prefixed = css;
  const replacements = [
    { pattern: /display:\s*flex;/g, value: 'display: -webkit-box;\n  display: -ms-flexbox;\n  display: flex;' },
    { pattern: /display:\s*inline-flex;/g, value: 'display: -webkit-inline-box;\n  display: -ms-inline-flexbox;\n  display: inline-flex;' },
    { pattern: /user-select:/g, value: '-webkit-user-select:' },
    { pattern: /appearance:\s*none;/g, value: '-webkit-appearance: none;\n  appearance: none;' },
    { pattern: /backdrop-filter:/g, value: '-webkit-backdrop-filter:' },
    { pattern: /object-fit:/g, value: '-o-object-fit:' },
    { pattern: /transition:/g, value: '-webkit-transition:' },
    { pattern: /box-shadow:/g, value: '-webkit-box-shadow:' },
    { pattern: /transform:/g, value: '-webkit-transform:' }
  ];

  replacements.forEach(({ pattern, value }) => {
    prefixed = prefixed.replace(pattern, (match) => `${value}\n  ${match}`);
  });

  return prefixed;
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, '')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s+/g, ' ')
    .trim();
}

function countClasses(css) {
  const matches = css.match(/\.[a-zA-Z0-9_-]+/g) || [];
  return new Set(matches).size;
}

async function loadConfig() {
  const configPath = path.resolve(__dirname, '../plugo.config.js');
  const module = await import(pathToFileURL(configPath));
  return module.default || module.config || {};
}

async function build() {
  const config = await loadConfig();
  const { theme, components } = config;

  let css = `/*\n  Plugo CSS Framework\n  Generated automatically from plugo.config.js\n*/\n\n`;
  css += generateColorPalette(theme.colors, config.darkMode);
  css += generateTypography(theme);
  css += '\n' + generateLayout(theme);
  css += '\n' + generateComponents(components, theme);
  css += '\n/* Utilities */\n' + generateUtilityCss(config);

  const prefixed = applyAutoprefix(css);
  const minified = minifyCSS(prefixed);

  const cssPath = path.resolve(__dirname, '../plugo.css');
  const minPath = path.resolve(__dirname, '../plugo.min.css');
  await fs.writeFile(cssPath, prefixed, 'utf8');
  await fs.writeFile(minPath, minified, 'utf8');

  const report = {
    classes: countClasses(prefixed),
    readableSize: `${Buffer.byteLength(prefixed)} bytes`,
    minifiedSize: `${Buffer.byteLength(minified)} bytes`
  };

  console.log('Plugo build complete');
  console.table(report);
}

build().catch((error) => {
  console.error('Failed to build Plugo CSS', error);
  process.exit(1);
});
