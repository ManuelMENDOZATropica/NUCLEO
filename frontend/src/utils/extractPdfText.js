const latin1Decoder = new TextDecoder("latin1");

function decodeLiteralString(input) {
  let result = "";
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char !== "\\") {
      result += char;
      continue;
    }

    const next = input[i + 1];
    if (!next) {
      result += "\\";
      continue;
    }

    i += 1;

    switch (next) {
      case "n":
        result += "\n";
        break;
      case "r":
        result += "\r";
        break;
      case "t":
        result += "\t";
        break;
      case "b":
        result += "\b";
        break;
      case "f":
        result += "\f";
        break;
      case "(":
        result += "(";
        break;
      case ")":
        result += ")";
        break;
      case "\\":
        result += "\\";
        break;
      default: {
        if (/[0-7]/.test(next)) {
          let octal = next;
          for (let j = 0; j < 2; j += 1) {
            const digit = input[i + 1];
            if (digit && /[0-7]/.test(digit)) {
              octal += digit;
              i += 1;
            } else {
              break;
            }
          }
          result += String.fromCharCode(parseInt(octal, 8));
        } else {
          result += next;
        }
      }
    }
  }
  return result;
}

function readLiteral(text, startIndex) {
  let index = startIndex + 1;
  let depth = 0;
  let literal = "";

  while (index < text.length) {
    const char = text[index];

    if (char === "\\") {
      if (index + 1 < text.length) {
        literal += char + text[index + 1];
        index += 2;
      } else {
        literal += char;
        index += 1;
      }
      continue;
    }

    if (char === "(") {
      depth += 1;
      literal += char;
      index += 1;
      continue;
    }

    if (char === ")") {
      if (depth === 0) {
        return { literal, endIndex: index + 1 };
      }

      depth -= 1;
      literal += char;
      index += 1;
      continue;
    }

    literal += char;
    index += 1;
  }

  return null;
}

function readArrayLiterals(text, startIndex) {
  const strings = [];
  let index = startIndex + 1;

  while (index < text.length) {
    const char = text[index];

    if (char === "(") {
      const literalResult = readLiteral(text, index);
      if (!literalResult) {
        return null;
      }

      strings.push(decodeLiteralString(literalResult.literal));
      index = literalResult.endIndex;
      continue;
    }

    if (char === "]") {
      return { strings, endIndex: index + 1 };
    }

    index += 1;
  }

  return null;
}

async function maybeInflate(buffer) {
  if (!(buffer instanceof Uint8Array)) {
    return buffer;
  }

  if (typeof DecompressionStream === "undefined") {
    return buffer;
  }

  const inflateWith = async format => {
    const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream(format));
    const arrayBuffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  try {
    return await inflateWith("deflate");
  } catch (error) {
    try {
      return await inflateWith("deflate-raw");
    } catch (innerError) {
      return buffer;
    }
  }
}

async function extractTextFromStreamBytes(streamBytes) {
  if (!(streamBytes instanceof Uint8Array) || streamBytes.length === 0) {
    return "";
  }

  let buffer = streamBytes;
  if (buffer[0] === 0x0d && buffer[1] === 0x0a) {
    buffer = buffer.subarray(2);
  } else if (buffer[0] === 0x0a) {
    buffer = buffer.subarray(1);
  }

  let data = buffer;
  const inflated = await maybeInflate(buffer);
  if (inflated && inflated.length > 0) {
    data = inflated;
  }

  const text = latin1Decoder.decode(data);
  const segments = [];

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (char === "(") {
      const literalResult = readLiteral(text, i);
      if (!literalResult) {
        continue;
      }

      const { literal, endIndex } = literalResult;
      let commandIndex = endIndex;

      while (commandIndex < text.length && /\s/.test(text[commandIndex])) {
        commandIndex += 1;
      }

      if (text.slice(commandIndex, commandIndex + 2) === "Tj") {
        segments.push(decodeLiteralString(literal));
      }

      i = endIndex - 1;
      continue;
    }

    if (char === "[") {
      const arrayResult = readArrayLiterals(text, i);
      if (!arrayResult) {
        continue;
      }

      const { strings, endIndex } = arrayResult;
      let commandIndex = endIndex;

      while (commandIndex < text.length && /\s/.test(text[commandIndex])) {
        commandIndex += 1;
      }

      if (text.slice(commandIndex, commandIndex + 2) === "TJ" && strings.length > 0) {
        segments.push(strings.join(""));
      }

      i = endIndex - 1;
    }
  }

  return segments.join("\n").trim();
}

export async function extractPdfTextFromBytes(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("extractPdfTextFromBytes requiere un Uint8Array válido");
  }

  const text = latin1Decoder.decode(bytes);
  const segments = [];
  let offset = 0;

  while (offset < text.length) {
    const streamIndex = text.indexOf("stream", offset);
    if (streamIndex === -1) {
      break;
    }

    const streamStart = streamIndex + 6;
    const endStreamIndex = text.indexOf("endstream", streamStart);
    if (endStreamIndex === -1) {
      break;
    }

    const slice = bytes.subarray(streamStart, endStreamIndex);
    const extracted = await extractTextFromStreamBytes(slice);
    if (extracted) {
      segments.push(extracted);
    }

    offset = endStreamIndex + 9;
  }

  return segments.join("\n\n").replace(/[\u0000\x00]+/g, "").trim();
}

export async function extractPdfText(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new TypeError("extractPdfText requiere un archivo válido");
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  return extractPdfTextFromBytes(bytes);
}

export default extractPdfText;
