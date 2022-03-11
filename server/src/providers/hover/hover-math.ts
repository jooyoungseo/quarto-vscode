/* --------------------------------------------------------------------------------------------
 * Copyright (c) RStudio, PBC. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import type {
  ConvertOption,
  SupportedExtension,
  SvgOption,
  TexOption,
} from "mathjax-full";
import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import type { LiteElement } from "mathjax-full/js/adaptors/lite/Element.js";
import type { MathDocument } from "mathjax-full/js/core/MathDocument.js";
import type { LiteDocument } from "mathjax-full/js/adaptors/lite/Document.js";
import type { LiteText } from "mathjax-full/js/adaptors/lite/Text.js";
import "mathjax-full/js/input/tex/AllPackages.js";

import {
  Hover,
  Position,
  MarkupContent,
  MarkupKind,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import { mathRange } from "../../core/markdown/markdown";
import { config } from "../../core/config";

export function mathHover(doc: TextDocument, pos: Position): Hover | null {
  const range = mathRange(doc, pos);
  if (range) {
    const contents = mathjaxTypesetToMarkdown(range.math);
    if (contents) {
      return {
        contents,
        range: range.range,
      };
    }
  }
  return null;
}

const baseExtensions: SupportedExtension[] = [
  "ams",
  "base",
  "color",
  "newcommand",
  "noerrors",
  "noundefined",
];

function createHtmlConverter(extensions: SupportedExtension[]) {
  const baseTexOption: TexOption = {
    packages: extensions,
    formatError: (_jax, error) => {
      throw new Error(error.message);
    },
  };
  const texInput = new TeX<LiteElement, LiteText, LiteDocument>(baseTexOption);
  const svgOption: SvgOption = { fontCache: "local" };
  const svgOutput = new SVG<LiteElement, LiteText, LiteDocument>(svgOption);
  return mathjax.document("", {
    InputJax: texInput,
    OutputJax: svgOutput,
  }) as MathDocument<LiteElement, LiteText, LiteDocument>;
}

// some globals
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
let html = createHtmlConverter(baseExtensions);

export function mathjaxLoadExtensions() {
  const extensionsToLoad = baseExtensions.concat(
    config
      .previewMathJaxExtensions()
      .filter((ex) => supportedExtensionList.includes(ex))
  );
  html = createHtmlConverter(extensionsToLoad);
}

function mathjaxTypesetToMarkdown(tex: string): MarkupContent | null {
  const typesetOpts = {
    scale: config.previewMathJaxScale(),
    color: getColor(),
  };
  try {
    const svg = typesetToSvg(tex, typesetOpts);
    const md = svgToDataUrl(svg);
    return {
      kind: MarkupKind.Markdown,
      value: `![equation](${md})`,
    };
  } catch (error: any) {
    return {
      kind: MarkupKind.Markdown,
      value: "**LaTeX Error**:\n" + error.message || "Unknown error",
    };
  }
}

function typesetToSvg(
  arg: string,
  opts: { scale: number; color: string }
): string {
  const convertOption: ConvertOption = {
    display: true,
    em: 18,
    ex: 9,
    containerWidth: 80 * 18,
  };
  const node = html.convert(arg, convertOption) as LiteElement;

  const css = `svg {font-size: ${100 * opts.scale}%;} * { color: ${
    opts.color
  } }`;
  let svgHtml = adaptor.innerHTML(node);
  svgHtml = svgHtml.replace(/<defs>/, `<defs><style>${css}</style>`);
  return svgHtml;
}

function getColor() {
  const lightness = config.previewMathJaxTheme();
  if (lightness === "light") {
    return "#000000";
  } else {
    return "#ffffff";
  }
}

function svgToDataUrl(xml: string): string {
  // We have to call encodeURIComponent and unescape because SVG can includes non-ASCII characters.
  // We have to encode them before converting them to base64.
  const svg64 = Buffer.from(
    unescape(encodeURIComponent(xml)),
    "binary"
  ).toString("base64");
  const b64Start = "data:image/svg+xml;base64,";
  return b64Start + svg64;
}

const supportedExtensionList = [
  "amscd",
  "bbox",
  "boldsymbol",
  "braket",
  "bussproofs",
  "cancel",
  "cases",
  "centernot",
  "colortbl",
  "empheq",
  "enclose",
  "extpfeil",
  "gensymb",
  "html",
  "mathtools",
  "mhchem",
  "physics",
  "textcomp",
  "textmacros",
  "unicode",
  "upgreek",
  "verb",
];
