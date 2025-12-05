/**
 *                                                       ██████
 *                                                      ███▒▒███
 *    █████████████   █████████████   █████████████    ▒███ ▒▒▒
 *   ▒▒███▒▒███▒▒███ ▒▒███▒▒███▒▒███ ▒▒███▒▒███▒▒███  ███████
 *    ▒███ ▒███ ▒███  ▒███ ▒███ ▒███  ▒███ ▒███ ▒███ ▒▒▒███▒
 *    ▒███ ▒███ ▒███  ▒███ ▒███ ▒███  ▒███ ▒███ ▒███   ▒███
 *    █████▒███ █████ █████▒███ █████ █████▒███ █████  █████
 *   ▒▒▒▒▒ ▒▒▒ ▒▒▒▒▒ ▒▒▒▒▒ ▒▒▒ ▒▒▒▒▒ ▒▒▒▒▒ ▒▒▒ ▒▒▒▒▒  ▒▒▒▒▒
 *
 *          mmmf: mining metadata from media files
 *
 *
 * Copyright 2025 akahuku, akahuku@gmail.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
class Parser {
    /**
	 * @param {object} options
	 * @returns {function}
	 */
    getLogFunction(options) {
        return typeof options.log === "function" ? options.log : options.log ? (...args) => {
            console.log(...args);
        } : () => {};
    }
    /**
	 * @param {object} options
	 * @returns {function}
	 */    getChunkHandlerFunction(options) {
        return typeof options.onchunk === "function" ? options.onchunk : () => {};
    }
    /**
	 * @param {string} key
	 * @param {string} value
	 * @return {object}
	 */    parseComment(key, value) {
        if (/^\s*\[/.test(value) && /\]\s*$/.test(value) || /^\s*\{/.test(value) && /\}\s*$/.test(value)) {
            try {
                const result = JSON.parse(value);
                return {
                    type: "JSON",
                    key: key,
                    value: result
                };
            } catch (err) {
                console.error(err);
            }
        }
        return {
            type: "asis",
            key: key,
            value: value
        };
    }
    /**
	 * Determine whether it is each format by testing the beginning of the buffer
	 *
	 * @param {Uint8Array} buffer
	 * @returns {boolean}
	 */    test(buffer) {}
    /**
	 * Parse a file
	 *
	 * @param {Uint8Array} buffer
	 * @param {object} options = {
	 *   randomize: {boolean},
	 *   stripComment: {boolean},
	 *   stripExif: {boolean},
	 *   stripXmp: {boolean},
	 *   returnChunks: {boolean} // Specify whether to return an array of chunks or
	 *                           // a Blob with the chunks merged
	 * }
	 * @returns {Promise<Array>|Promise<Blob>}
	 */    async parse(buffer, options = {}) {}
}

/**
 * Creates a new UUID (v4)
 *
 * @returns {Promise<string>}
 */ async function createUUIDv4() {
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        const crypto = await import("node:crypto");
        return crypto.randomUUID();
    } else if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    } else {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)).replace(/y/g, () => (Math.floor(Math.random() * 4) + 8).toString(16));
    }
}

/**
 * Decompresses a deflate buffer
 *
 * @param {ArrayBuffer|Array} inputArray
 * @returns {Promise<ArrayBuffer>}
 */ async function decompressDeflate(inputArray) {
    if (typeof process !== "undefined" && process.versions && process.versions.node) {
        try {
            const zlib = await import("node:zlib");
            const {promisify: promisify} = await import("node:util");
            const inflate = promisify(zlib.inflate);
            const buffer = Buffer.from(inputArray);
            const decompressedBuffer = await inflate(buffer);
            const arrayBuffer = decompressedBuffer.buffer.slice(decompressedBuffer.byteOffset, decompressedBuffer.byteOffset + decompressedBuffer.byteLength);
            return arrayBuffer;
        } catch (err) {
            console.error("Node.js decompression failed:", err);
            throw err;
        }
    } else if (typeof DecompressionStream !== "undefined") {
        try {
            const uint8Array = toUint8Array(inputArray);
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(uint8Array);
                    controller.close();
                }
            });
            const decompressionStream = new DecompressionStream("deflate");
            const decompressedStream = readableStream.pipeThrough(decompressionStream);
            const chunks = [];
            for await (const chunk of decompressedStream) {
                chunks.push(chunk);
            }
            return await new Blob(chunks).arrayBuffer();
        } catch (err) {
            console.error("Browser decompression failed:", err);
            throw err;
        }
    } else {
        throw new Error("Unsupported environment: Neither DecompressionStream nor Node.js zlib is available.");
    }
}

/**
 * Generate an Uint8Array from multiple types
 *
 * @param {TypedArray|ArrayBuffer|Array} input
 * @returns {Uint8Array}
 */ function toUint8Array(input) {
    if (input instanceof Uint8Array) {
        return input;
    }
    if (ArrayBuffer.isView(input)) {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    if (input instanceof ArrayBuffer) {
        return new Uint8Array(input);
    }
    if (Array.isArray(input)) {
        return Uint8Array.from(input);
    }
    throw new Error("Unsupported input type");
}

const DETECTING_MAX_BYTES = 2048;

const testers = {
    "iso-2022-jp": (data, len) => {
        for (let i = 0; i < len; i++) {
            const b = data[i];
            if (b >= 128) {
                return [ i ];
            }
            if (b === 27) {
                if (i + 2 >= len) {
                    return [ i ];
                }
                const esc1 = data[i + 1];
                const esc2 = data[i + 2];
                if (esc1 === 36) {
                    if (esc2 === 40 || esc2 === 64 || esc2 === 66) {
                        return [ i ];
                    }
                } else if (esc1 === 38 && esc2 === 64) {
                    return [ i ];
                } else if (esc1 === 40) {
                    if (esc2 === 66 || esc2 === 73 || esc2 === 74) {
                        return [ i ];
                    }
                }
            }
        }
        return [ len ];
    },
    shift_jis: (data, len) => {
        for (let i = 0; i < len; i++) {
            let b = data[i];
            if (b < 128 || 161 <= b && b <= 223) {
                continue;
            }
            if (b === 128 || b === 160 || b > 239 || i + 1 >= len) {
                return [ i ];
            }
            b = data[i + 1];
            if (b < 64 || b === 127 || b > 252) {
                return [ i ];
            }
            i++;
        }
        return [ len ];
    },
    "utf-8": (data, len) => {
        for (let i = 0; i < len; i++) {
            const b = data[i];
            if (0 <= b && b <= 126) {
                continue;
            }
            if (b >= 194 && b <= 223) {
                if (i + 1 >= len || data[i + 1] < 128 || data[i + 1] > 191) {
                    return [ i ];
                }
                i++;
            } else if (b === 224) {
                if (i + 2 >= len || data[i + 1] < 160 || data[i + 1] > 191 || data[i + 2] < 128 || data[i + 2] > 191) {
                    return [ i ];
                }
                i += 2;
            } else if (225 <= b && b <= 236 || b === 238 || b === 239) {
                if (i + 2 >= len || data[i + 1] < 128 || data[i + 1] > 191 || data[i + 2] < 128 || data[i + 2] > 191) {
                    return [ i ];
                }
                i += 2;
            } else if (b === 237) {
                if (i + 2 >= len || data[i + 1] < 128 || data[i + 1] > 159 || data[i + 2] < 128 || data[i + 2] > 191) {
                    return [ i ];
                }
                i += 2;
            } else if (b === 240) {
                if (i + 3 >= len || data[i + 1] < 144 || data[i + 1] > 191 || data[i + 2] < 128 || data[i + 2] > 191 || data[i + 3] < 128 || data[i + 3] > 191) {
                    return [ i ];
                }
                i += 3;
            } else if (241 <= b && b <= 243) {
                if (i + 3 >= len || data[i + 1] < 128 || data[i + 1] > 191 || data[i + 2] < 128 || data[i + 2] > 191 || data[i + 3] < 128 || data[i + 3] > 191) {
                    return [ i ];
                }
                i += 3;
            } else if (b === 244) {
                if (i + 3 >= len || data[i + 1] < 128 || data[i + 1] > 143 || data[i + 2] < 128 || data[i + 2] > 191 || data[i + 3] < 128 || data[i + 3] > 191) {
                    return [ i ];
                }
                i += 3;
            } else {
                return [ i ];
            }
        }
        return [ len ];
    },
    "utf-16": (data, len) => {
        if (len < 2) return [ -1 ];
        if (data[0] === 255 && data[1] === 254) return [ len, "utf-16le" ];
        if (data[0] === 254 && data[1] === 255) return [ len, "utf-16be" ];
        let leValidBytes = 0, beValidBytes = 0;
        let leValidWords = 0, beValidWords = 0;
        for (let i = 0; i + 1 < len; i += 2) {
            const leadByte = data[i];
            const trailByte = data[i + 1];
            if (leadByte === 0 && trailByte >= 32 && trailByte <= 126) {
                beValidBytes += 2;
            } else if (trailByte === 0 && leadByte >= 32 && leadByte <= 126) {
                leValidBytes += 2;
            }
            const leWord = leadByte | trailByte << 8;
            if (leWord >= 9 && leWord <= 55295 || leWord >= 57344 && leWord <= 65533) {
                leValidWords += 2;
            }
            const beWord = leadByte << 8 | trailByte;
            if (beWord >= 9 && beWord <= 55295 || beWord >= 57344 && beWord <= 65533) {
                beValidWords += 2;
            }
        }
        if (leValidBytes > beValidBytes || leValidWords > beValidWords) {
            if (leValidBytes / len >= .95) {
                return [ len * 2, "utf-16le" ];
            } else {
                return [ Math.max(leValidBytes, leValidWords), "utf-16le" ];
            }
        }
        if (beValidBytes > leValidBytes || beValidWords > leValidWords) {
            if (beValidBytes / len >= .95) {
                return [ len * 2, "utf-16be" ];
            } else {
                return [ Math.max(beValidBytes, beValidWords), "utf-16be" ];
            }
        }
        return [ 0 ];
    },
    latin1: (data, len) => [ 0 ]
};

function detectEncoding(source, options = {}) {
    const encodings = [ "iso-2022-jp", "shift_jis", "utf-8", "utf-16", "latin1" ];
    if (Array.isArray(options.encodings)) {
        encodings.splice(0, encodings.length, ...options.encodings);
    }
    const data = toUint8Array(source);
    const len = Math.min(data.length, DETECTING_MAX_BYTES);
    const detectResults = encodings.map(encoding => {
        if (encoding in testers) {
            const testResult = testers[encoding](data, len);
            return {
                encoding: testResult[1] ?? encoding,
                index: testResult[0]
            };
        } else {
            return {
                encoding: encoding,
                index: -1
            };
        }
    }).sort((a, b) => b.index - a.index);
    if (options.log) {
        console.log(`*** encoding evaluation result ***`);
        console.dir(detectResults);
    }
    for (const detectResult of detectResults) {
        let result;
        if (detectResult.encoding === "latin1") {
            result = Array.from(data).map(cp => String.fromCharCode(cp)).join("").replace(/\x00+$/, "").replace(/[^\x09\x0d\x0a\x20-\x7e]/g, $0 => `<${$0.charCodeAt(0).toString(16).padStart(2, "0")}>`);
        } else {
            try {
                result = new TextDecoder(detectResult.encoding, {
                    fatal: true
                }).decode(data);
            } catch {
                result = null;
            }
        }
        if (typeof result === "string") {
            return {
                result: result,
                detectedEncoding: detectResult.encoding
            };
        }
    }
    return null;
}

const EXIF_HEADER_STRING = "Exif\0\0";

const EXIF_SEGMENT_HEADER_SIZE_BYTES = 6;

const exifTagProps = {
    "tiff.000b": [ "ProcessingSoftware?" ],
    "tiff.00fe": [ "NewSubfileType?" ],
    "tiff.00ff": [ "SubfileType?" ],
    "tiff.0100": [ "ImageWidth", [ 3, 4 ], 1 ],
    "tiff.0101": [ "ImageLength", [ 3, 4 ], 1 ],
    "tiff.0102": [ "BitsPerSample", 3, 3 ],
    "tiff.0103": [ "Compression", 3, 1, null, value => {
        switch (value) {
          case 6:
            value = `${value} - JPEG (thumbnail only)`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "tiff.0106": [ "PhotometricInterpretation", 3, 1 ],
    "tiff.0107": [ "Thresholding?" ],
    "tiff.0108": [ "CellWidth?" ],
    "tiff.0109": [ "CellLength?" ],
    "tiff.010a": [ "FillOrder?" ],
    "tiff.010d": [ "DocumentName?" ],
    "tiff.010e": [ "ImageDescription", 2 ],
    "tiff.010f": [ "Make", 2 ],
    "tiff.0110": [ "Model", 2 ],
    "tiff.0111": [ "StripOffsets", [ 3, 4 ] ],
    "tiff.0112": [ "Orientation", 3, 1, null, value => {
        switch (value) {
          case 1:
            value = `${value} - Normal`;
            break;

          case 2:
            value = `${value} - Horizontal mirrored`;
            break;

          case 3:
            value = `${value} - Rotate 180°`;
            break;

          case 4:
            value = `${value} - Vertical mirrored`;
            break;

          case 5:
            value = `${value} - Horizontal mirrored, then rotate 90°`;
            break;

          case 6:
            value = `${value} - Rotate -90°`;
            break;

          case 7:
            value = `${value} - Horizontal mirrored, then rotate -90°`;
            break;

          case 8:
            value = `${value} - Rotate 90°`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "tiff.0115": [ "SamplesPerPixel", 3, 1 ],
    "tiff.0116": [ "RowsPerStrip", [ 3, 4 ], 1 ],
    "tiff.0117": [ "StripByteCounts", [ 3, 4 ] ],
    "tiff.0118": [ "MinSampleValue?" ],
    "tiff.0119": [ "MaxSampleValue?" ],
    "tiff.011a": [ "XResolution", 5, 1 ],
    "tiff.011b": [ "YResolution", 5, 1 ],
    "tiff.011c": [ "PlanarConfiguration", 3, 1 ],
    "tiff.011d": [ "PageName?" ],
    "tiff.011e": [ "XPosition?" ],
    "tiff.011f": [ "YPosition?" ],
    "tiff.0122": [ "GrayResponseUnit?" ],
    "tiff.0123": [ "GrayResponseCurve?" ],
    "tiff.0124": [ "T4Options?" ],
    "tiff.0125": [ "T6Options?" ],
    "tiff.0128": [ "ResolutionUnit", 3, 1, null, value => {
        switch (value) {
          case 2:
            value = `${value} - inch`;
            break;

          case 3:
            value = `${value} - centimeter`;
            break;

          default:
            value = `${value} - reserved`;
            break;
        }
        return value;
    } ],
    "tiff.0129": [ "PageNumber?" ],
    "tiff.012c": [ "ColoreResponseUnit?" ],
    "tiff.012d": [ "TransferFunction", 3, 3 * 256 ],
    "tiff.0131": [ "Software", 2 ],
    "tiff.0132": [ "DateTime", 2, 20 ],
    "tiff.013b": [ "Artist", 2 ],
    "tiff.013c": [ "HostComputer?" ],
    "tiff.013d": [ "Predictor?" ],
    "tiff.013e": [ "WhitePoint", 5, 2 ],
    "tiff.013f": [ "PrimaryChromaticities", 5, 6 ],
    "tiff.0140": [ "ColorMap?" ],
    "tiff.0141": [ "HalftoneHints?" ],
    "tiff.0142": [ "TileWidth?" ],
    "tiff.0143": [ "TileLength?" ],
    "tiff.0144": [ "TileOffsets?" ],
    "tiff.0145": [ "TileByCounts?" ],
    "tiff.0146": [ "BadFaxLines?" ],
    "tiff.0147": [ "CleanFaxData?" ],
    "tiff.0148": [ "ConsecutiveBadFaxLines?" ],
    "tiff.014a": [ "SubIFDs?" ],
    "tiff.014c": [ "InkSet?" ],
    "tiff.014d": [ "InkNames?" ],
    "tiff.014e": [ "NumberofInks?" ],
    "tiff.0150": [ "DotRange?" ],
    "tiff.0151": [ "TargetPrinter?" ],
    "tiff.0152": [ "ExtraSamples?" ],
    "tiff.0153": [ "SampleFormat?" ],
    "tiff.0154": [ "SMinSampleValue?" ],
    "tiff.0155": [ "SMaxSampleValue?" ],
    "tiff.0156": [ "TransferRange?" ],
    "tiff.0157": [ "ClipPath?" ],
    "tiff.0158": [ "XClipPathUnits?" ],
    "tiff.0159": [ "YClipPathUnits?" ],
    "tiff.015a": [ "Indexed?" ],
    "tiff.015b": [ "JPEGTables?" ],
    "tiff.015f": [ "OPIProxy?" ],
    "tiff.0190": [ "GlobalParametersIFD?" ],
    "tiff.0191": [ "ProfileType?" ],
    "tiff.0192": [ "FaxProfile?" ],
    "tiff.0193": [ "CodingMethods?" ],
    "tiff.0194": [ "VersionYear?" ],
    "tiff.0195": [ "ModeNumber?" ],
    "tiff.01b1": [ "Decode?" ],
    "tiff.01b2": [ "DefaultImageColor?" ],
    "tiff.01b3": [ "T82Options?" ],
    "tiff.01b5": [ "JPEGTables?" ],
    "tiff.0200": [ "JPEGProc?" ],
    "tiff.0201": [ "JPEGInterchangeFormat", 4, 1 ],
    "tiff.0202": [ "JPEGInterchangeFormatLength", 4, 1 ],
    "tiff.0203": [ "JPEGRestartInterval?" ],
    "tiff.0205": [ "JPEGLosslessPredictors?" ],
    "tiff.0206": [ "JPEGPointTransforms?" ],
    "tiff.0207": [ "JPEGQTables?" ],
    "tiff.0208": [ "JPEGDCTables?" ],
    "tiff.0209": [ "JPEGACTables?" ],
    "tiff.0211": [ "YCbCrCoefficients", 5, 3 ],
    "tiff.0212": [ "YCbCrSubSampling", 3, 2 ],
    "tiff.0213": [ "YCbCrPositioning", 3, 1, null, value => {
        switch (value) {
          case 1:
            value = `${value} - centered`;
            break;

          case 2:
            value = `${value} - co-sited`;
            break;

          default:
            value = `${value} - reserved`;
            break;
        }
        return value;
    } ],
    "tiff.0214": [ "ReferenceBlackWhite", 5, 6 ],
    "tiff.022f": [ "StripRowCounts?" ],
    "tiff.02bc": [ "ApplicationNotes?" ],
    "tiff.0303": [ "RenderingIntent?" ],
    "tiff.03e7": [ "USPTOMiscellaneous?" ],
    "tiff.4746": [ "Rating?" ],
    "tiff.4747": [ "XP_DIP_XML?" ],
    "tiff.4748": [ "StitchInfo?" ],
    "tiff.4749": [ "RatingPercent?" ],
    "tiff.5001": [ "ResolutionXUnit?" ],
    "tiff.5002": [ "ResolutionYUnit?" ],
    "tiff.5003": [ "ResolutionXLengthUnit?" ],
    "tiff.5004": [ "ResolutionYLengthUnit?" ],
    "tiff.5005": [ "PrintFlags?" ],
    "tiff.5006": [ "PrintFlagsVersion?" ],
    "tiff.5007": [ "PrintFlagsCrop?" ],
    "tiff.5008": [ "PrintFlagsBleedWidth?" ],
    "tiff.5009": [ "PrintFlagsBleedWidthScale?" ],
    "tiff.500a": [ "HalftoneLPI?" ],
    "tiff.500b": [ "HalftoneLPIUnit?" ],
    "tiff.500c": [ "HalftoneDegree?" ],
    "tiff.500d": [ "HalftoneShape?" ],
    "tiff.500e": [ "HalftoneMisc?" ],
    "tiff.500f": [ "HalftoneScreen?" ],
    "tiff.5010": [ "JPEGQuality?" ],
    "tiff.5011": [ "GridSize?" ],
    "tiff.5012": [ "ThumbnailFormat?" ],
    "tiff.5013": [ "ThumbnailWidth?" ],
    "tiff.5014": [ "ThumbnailHeight?" ],
    "tiff.5015": [ "ThumbnailColorDepth?" ],
    "tiff.5016": [ "ThumbnailPlanes?" ],
    "tiff.5017": [ "ThumbnailRawBytes?" ],
    "tiff.5018": [ "ThumbnailLength?" ],
    "tiff.5019": [ "ThumbnailCompressedSize?" ],
    "tiff.501a": [ "ColorTransferFunction?" ],
    "tiff.501b": [ "ThumbnailData?" ],
    "tiff.5020": [ "ThumbnailImageWidth?" ],
    "tiff.5021": [ "ThumbnailImageHeight?" ],
    "tiff.5022": [ "ThumbnailBitsPerSample?" ],
    "tiff.5023": [ "ThumbnailCompression?" ],
    "tiff.5024": [ "ThumbnailPhotometricInterp?" ],
    "tiff.5025": [ "ThumbnailDescription?" ],
    "tiff.5026": [ "ThumbnailEquipMake?" ],
    "tiff.5027": [ "ThumbnailEquipModel?" ],
    "tiff.5028": [ "ThumbnailStripOffsets?" ],
    "tiff.5029": [ "ThumbnailOrientation?" ],
    "tiff.502a": [ "ThumbnailSamplesPerPixel?" ],
    "tiff.502b": [ "ThumbnailRowsPerStrip?" ],
    "tiff.502c": [ "ThumbnailStripByteCounts?" ],
    "tiff.502d": [ "ThumbnailResolutionX?" ],
    "tiff.502e": [ "ThumbnailResolutionY?" ],
    "tiff.502f": [ "ThumbnailPlanarConfig?" ],
    "tiff.5030": [ "ThumbnailResolutionUnit?" ],
    "tiff.5031": [ "ThumbnailTransferFunction?" ],
    "tiff.5032": [ "ThumbnailSoftware?" ],
    "tiff.5033": [ "ThumbnailDateTime?" ],
    "tiff.5034": [ "ThumbnailArtist?" ],
    "tiff.5035": [ "ThumbnailWhitePoint?" ],
    "tiff.5036": [ "ThumbnailPrimaryChromaticities?" ],
    "tiff.5037": [ "ThumbnailYCbCrCoefficients?" ],
    "tiff.5038": [ "ThumbnailYCbCrSubsampling?" ],
    "tiff.5039": [ "ThumbnailYCbCrPositioning?" ],
    "tiff.503a": [ "ThumbnailRefBlackWhite?" ],
    "tiff.503b": [ "ThumbnailCopyright?" ],
    "tiff.5090": [ "LuminanceTable?" ],
    "tiff.5091": [ "ChrominanceTable?" ],
    "tiff.5100": [ "FrameDelay?" ],
    "tiff.5101": [ "LoopCount?" ],
    "tiff.5102": [ "GlobalPalette?" ],
    "tiff.5103": [ "IndexBackground?" ],
    "tiff.5104": [ "IndexTransparent?" ],
    "tiff.5110": [ "PixelUnits?" ],
    "tiff.5111": [ "PixelsPerUnitX?" ],
    "tiff.5112": [ "PixelsPerUnitY?" ],
    "tiff.5113": [ "PaletteHistogram?" ],
    "tiff.7000": [ "SonyRawFileType?" ],
    "tiff.7010": [ "SonyToneCurve?" ],
    "tiff.7031": [ "VignettingCorrection?" ],
    "tiff.7032": [ "VignettingCorrParams?" ],
    "tiff.7034": [ "ChromaticAberrationCorrection?" ],
    "tiff.7035": [ "ChromaticAberrationCorrParams?" ],
    "tiff.7036": [ "DistortionCorrection?" ],
    "tiff.7037": [ "DistortionCorrParams?" ],
    "tiff.7038": [ "SonyRawImageSize?" ],
    "tiff.7310": [ "BlackLevel?" ],
    "tiff.7313": [ "WB_RGGBLevels?" ],
    "tiff.74c7": [ "SonyCropTopLeft?" ],
    "tiff.74c8": [ "SonyCropSize?" ],
    "tiff.800d": [ "ImageID?" ],
    "tiff.80a3": [ "WangTag1?" ],
    "tiff.80a4": [ "WangAnnotation?" ],
    "tiff.80a5": [ "WangTag3?" ],
    "tiff.80a6": [ "WangTag4?" ],
    "tiff.80b9": [ "ImageReferencePoints?" ],
    "tiff.80ba": [ "RegionXformTackPoint?" ],
    "tiff.80bb": [ "WarpQuadrilateral?" ],
    "tiff.80bc": [ "AffineTransformMat?" ],
    "tiff.80e3": [ "Matteing?" ],
    "tiff.80e4": [ "DataType?" ],
    "tiff.80e5": [ "ImageDepth?" ],
    "tiff.80e6": [ "TileDepth?" ],
    "tiff.8214": [ "ImageFullWidth?" ],
    "tiff.8215": [ "ImageFullHeight?" ],
    "tiff.8216": [ "TextureFormat?" ],
    "tiff.8217": [ "WrapModes?" ],
    "tiff.8218": [ "FovCot?" ],
    "tiff.8219": [ "MatrixWorldToScreen?" ],
    "tiff.821a": [ "MatrixWorldToCamera?" ],
    "tiff.827d": [ "Model2?" ],
    "tiff.828d": [ "CFARepeatPatternDim?" ],
    "tiff.828e": [ "CFAPattern?" ],
    "tiff.828f": [ "BatteryLevel?" ],
    "tiff.8290": [ "KodakIFD?" ],
    "tiff.8298": [ "Copyright", 2, null, null, value => {
        const index = value.indexOf("\0");
        if (index >= 0) {
            value = [ `Photography copyright holder: ${value.substring(0, index)}`, `Editing copyright holder: ${value.substring(index + 1)}` ].join("\n");
        }
        return value;
    } ],
    "tiff.82a5": [ "MDFileTag?" ],
    "tiff.82a6": [ "MDScalePixel?" ],
    "tiff.82a7": [ "MDColorTable?" ],
    "tiff.82a8": [ "MDLabName?" ],
    "tiff.82a9": [ "MDSampleInfo?" ],
    "tiff.82aa": [ "MDPrepDate?" ],
    "tiff.82ab": [ "MDPrepTime?" ],
    "tiff.82ac": [ "MDFileUnits?" ],
    "tiff.830e": [ "PixelScale?" ],
    "tiff.8335": [ "AdventScale?" ],
    "tiff.8336": [ "AdventRevision?" ],
    "tiff.835c": [ "UIC1Tag?" ],
    "tiff.835d": [ "UIC2Tag?" ],
    "tiff.835e": [ "UIC3Tag?" ],
    "tiff.835f": [ "UIC4Tag?" ],
    "tiff.83bb": [ "IPTC/NAA?" ],
    "tiff.847e": [ "IntergraphPacketData?" ],
    "tiff.847f": [ "IntergraphFlagRegisters?" ],
    "tiff.8480": [ "IntergraphMatrix?" ],
    "tiff.8481": [ "INGRReserved?" ],
    "tiff.8482": [ "ModelTiePoint?" ],
    "tiff.84e0": [ "Site?" ],
    "tiff.84e1": [ "ColorSequence?" ],
    "tiff.84e2": [ "IT8Header?" ],
    "tiff.84e3": [ "RasterPadding?" ],
    "tiff.84e4": [ "BitsPerRunLength?" ],
    "tiff.84e5": [ "BitsPerExtendedRunLength?" ],
    "tiff.84e6": [ "ColorTable?" ],
    "tiff.84e7": [ "ImageColorIndicator?" ],
    "tiff.84e8": [ "BackgroundColorIndicator?" ],
    "tiff.84e9": [ "ImageColorValue?" ],
    "tiff.84ea": [ "BackgroundColorValue?" ],
    "tiff.84eb": [ "PixelIntensityRange?" ],
    "tiff.84ec": [ "TransparencyIndicator?" ],
    "tiff.84ed": [ "ColorCharacterization?" ],
    "tiff.84ee": [ "HCUsage?" ],
    "tiff.84ef": [ "TrapIndicator?" ],
    "tiff.84f0": [ "CMYKEquivalent?" ],
    "tiff.8546": [ "SEMInfo?" ],
    "tiff.8568": [ "AFCP_IPTC?" ],
    "tiff.85b8": [ "PixelMagicJBIGOptions?" ],
    "tiff.85d7": [ "JPLCartoIFD?" ],
    "tiff.85d8": [ "ModelTransform?" ],
    "tiff.8602": [ "WB_GRGBLevels?" ],
    "tiff.8606": [ "LeafData?" ],
    "tiff.8649": [ "PhotoshopSettings?" ],
    "tiff.8769": [ "ExifIFDPointer", 4, 1 ],
    "tiff.8773": [ "InterColorProfile?" ],
    "tiff.877f": [ "TIFF_FXExtensions?" ],
    "tiff.8780": [ "MultiProfiles?" ],
    "tiff.8781": [ "SharedData?" ],
    "tiff.8782": [ "T88Options?" ],
    "tiff.87ac": [ "ImageLayer?" ],
    "tiff.87af": [ "GeoTiffDirectory?" ],
    "tiff.87b0": [ "GeoTiffDoubleParams?" ],
    "tiff.87b1": [ "GeoTiffAsciiParams?" ],
    "tiff.87be": [ "JBIGOptions?" ],
    "tiff.8825": [ "GPSIFDPointer", 4, 1 ],
    "tiff.8829": [ "Interlace?" ],
    "tiff.882a": [ "TimeZoneOffset?" ],
    "tiff.882b": [ "SelfTimerMode?" ],
    "tiff.885c": [ "FaxRecvParams?" ],
    "tiff.885d": [ "FaxSubAddress?" ],
    "tiff.885e": [ "FaxRecvTime?" ],
    "tiff.8871": [ "FedexEDR?" ],
    "tiff.888a": [ "LeafSubIFD?" ],
    "tiff.920b": [ "FlashEnergy?" ],
    "tiff.920c": [ "SpatialFrequencyResponse?" ],
    "tiff.920d": [ "Noise?" ],
    "tiff.920e": [ "FocalPlaneXResolution?" ],
    "tiff.920f": [ "FocalPlaneYResolution?" ],
    "tiff.9210": [ "FocalPlaneResolutionUnit?" ],
    "tiff.9211": [ "ImageNumber?" ],
    "tiff.9212": [ "SecurityClassification?" ],
    "tiff.9213": [ "ImageHistory?" ],
    "tiff.9214": [ "SubjectLocation?" ],
    "tiff.9215": [ "ExposureIndex?" ],
    "tiff.9216": [ "TIFF-EPStandardID?" ],
    "tiff.9217": [ "SensingMethod?" ],
    "tiff.932f": [ "MSDocumentText?" ],
    "tiff.9330": [ "MSPropertySetStorage?" ],
    "tiff.9331": [ "MSDocumentTextPosition?" ],
    "tiff.935c": [ "ImageSourceData?" ],
    "tiff.9c9b": [ "XPTitle", 1, null, null, value => new TextDecoder("utf-16le").decode(Uint8Array.from(value)).replace(/\x00+$/, "") ],
    "tiff.9c9c": [ "XPComment", 1, null, null, value => exifTagProps["tiff.9c9b"][4](value) ],
    "tiff.9c9d": [ "XPAuthor", 1, null, null, value => exifTagProps["tiff.9c9b"][4](value) ],
    "tiff.9c9e": [ "XPKeywords", 1, null, null, value => exifTagProps["tiff.9c9b"][4](value) ],
    "tiff.9c9f": [ "XPSubject", 1, null, null, value => exifTagProps["tiff.9c9b"][4](value) ],
    "tiff.a010": [ "SamsungRawPointersOffset?" ],
    "tiff.a011": [ "SamsungRawPointersLength?" ],
    "tiff.a101": [ "SamsungRawByteOrder?" ],
    "tiff.a102": [ "SamsungRawUnknown?" ],
    "tiff.a20c": [ "SpatialFrequencyResponse?" ],
    "tiff.a20d": [ "Noise?" ],
    "tiff.a211": [ "ImageNumber?" ],
    "tiff.a212": [ "SecurityClassification?" ],
    "tiff.a213": [ "ImageHistory?" ],
    "tiff.a216": [ "TIFF-EPStandardID?" ],
    "tiff.a480": [ "GDALMetadata?" ],
    "tiff.a481": [ "GDALNoData?" ],
    "tiff.afc0": [ "ExpandSoftware?" ],
    "tiff.afc1": [ "ExpandLens?" ],
    "tiff.afc2": [ "ExpandFilm?" ],
    "tiff.afc3": [ "ExpandFilterLens?" ],
    "tiff.afc4": [ "ExpandScanner?" ],
    "tiff.afc5": [ "ExpandFlashLamp?" ],
    "tiff.b4c3": [ "HasselbladRawImage?" ],
    "tiff.bc01": [ "PixelFormat?" ],
    "tiff.bc02": [ "Transformation?" ],
    "tiff.bc03": [ "Uncompressed?" ],
    "tiff.bc04": [ "ImageType?" ],
    "tiff.bc80": [ "ImageWidth?" ],
    "tiff.bc81": [ "ImageHeight?" ],
    "tiff.bc82": [ "WidthResolution?" ],
    "tiff.bc83": [ "HeightResolution?" ],
    "tiff.bcc0": [ "ImageOffset?" ],
    "tiff.bcc1": [ "ImageByteCount?" ],
    "tiff.bcc2": [ "AlphaOffset?" ],
    "tiff.bcc3": [ "AlphaByteCount?" ],
    "tiff.bcc4": [ "ImageDataDiscard?" ],
    "tiff.bcc5": [ "AlphaDataDiscard?" ],
    "tiff.c427": [ "OceScanjobDesc?" ],
    "tiff.c428": [ "OceApplicationSelector?" ],
    "tiff.c429": [ "OceIDNumber?" ],
    "tiff.c42a": [ "OceImageLogic?" ],
    "tiff.c44f": [ "Annotations?" ],
    "tiff.c4a5": [ "PrintIM?", 7, null, null, value => `[PrintIM ${value.length} bytes data]` ],
    "tiff.c519": [ "HasselbladXML?" ],
    "tiff.c51b": [ "HasselbladExif?" ],
    "tiff.c573": [ "OriginalFileName?" ],
    "tiff.c580": [ "USPTOOriginalContentType?" ],
    "tiff.c5e0": [ "CR2CFAPattern?" ],
    "tiff.c612": [ "DNGVersion?" ],
    "tiff.c613": [ "DNGBackwardVersion?" ],
    "tiff.c614": [ "UniqueCameraModel?" ],
    "tiff.c615": [ "LocalizedCameraModel?" ],
    "tiff.c616": [ "CFAPlaneColor?" ],
    "tiff.c617": [ "CFALayout?" ],
    "tiff.c618": [ "LinearizationTable?" ],
    "tiff.c619": [ "BlackLevelRepeatDim?" ],
    "tiff.c61a": [ "BlackLevel?" ],
    "tiff.c61b": [ "BlackLevelDeltaH?" ],
    "tiff.c61c": [ "BlackLevelDeltaV?" ],
    "tiff.c61d": [ "WhiteLevel?" ],
    "tiff.c61e": [ "DefaultScale?" ],
    "tiff.c61f": [ "DefaultCropOrigin?" ],
    "tiff.c620": [ "DefaultCropSize?" ],
    "tiff.c621": [ "ColorMatrix1?" ],
    "tiff.c622": [ "ColorMatrix2?" ],
    "tiff.c623": [ "CameraCalibration1?" ],
    "tiff.c624": [ "CameraCalibration2?" ],
    "tiff.c625": [ "ReductionMatrix1?" ],
    "tiff.c626": [ "ReductionMatrix2?" ],
    "tiff.c627": [ "AnalogBalance?" ],
    "tiff.c628": [ "AsShotNeutral?" ],
    "tiff.c629": [ "AsShotWhiteXY?" ],
    "tiff.c62a": [ "BaselineExposure?" ],
    "tiff.c62b": [ "BaselineNoise?" ],
    "tiff.c62c": [ "BaselineSharpness?" ],
    "tiff.c62d": [ "BayerGreenSplit?" ],
    "tiff.c62e": [ "LinearResponseLimit?" ],
    "tiff.c62f": [ "CameraSerialNumber?" ],
    "tiff.c630": [ "DNGLensInfo?" ],
    "tiff.c631": [ "ChromaBlurRadius?" ],
    "tiff.c632": [ "AntiAliasStrength?" ],
    "tiff.c633": [ "ShadowScale?" ],
    "tiff.c634": [ "SR2Private?" ],
    "tiff.c635": [ "MakerNoteSafety?" ],
    "tiff.c640": [ "RawImageSegmentation?" ],
    "tiff.c65a": [ "CalibrationIlluminant1?" ],
    "tiff.c65b": [ "CalibrationIlluminant2?" ],
    "tiff.c65c": [ "BestQualityScale?" ],
    "tiff.c65d": [ "RawDataUniqueID?" ],
    "tiff.c660": [ "AliasLayerMetadata?" ],
    "tiff.c68b": [ "OriginalRawFileName?" ],
    "tiff.c68c": [ "OriginalRawFileData?" ],
    "tiff.c68d": [ "ActiveArea?" ],
    "tiff.c68e": [ "MaskedAreas?" ],
    "tiff.c68f": [ "AsShotICCProfile?" ],
    "tiff.c690": [ "AsShotPreProfileMatrix?" ],
    "tiff.c691": [ "CurrentICCProfile?" ],
    "tiff.c692": [ "CurrentPreProfileMatrix?" ],
    "tiff.c6bf": [ "ColorimetricReference?" ],
    "tiff.c6c5": [ "SRawType?" ],
    "tiff.c6d2": [ "PanasonicTitle?" ],
    "tiff.c6d3": [ "PanasonicTitle2?" ],
    "tiff.c6f3": [ "CameraCalibrationSig?" ],
    "tiff.c6f4": [ "ProfileCalibrationSig?" ],
    "tiff.c6f5": [ "ProfileIFD?" ],
    "tiff.c6f6": [ "AsShotProfileName?" ],
    "tiff.c6f7": [ "NoiseReductionApplied?" ],
    "tiff.c6f8": [ "ProfileName?" ],
    "tiff.c6f9": [ "ProfileHueSatMapDims?" ],
    "tiff.c6fa": [ "ProfileHueSatMapData1?" ],
    "tiff.c6fb": [ "ProfileHueSatMapData2?" ],
    "tiff.c6fc": [ "ProfileToneCurve?" ],
    "tiff.c6fd": [ "ProfileEmbedPolicy?" ],
    "tiff.c6fe": [ "ProfileCopyright?" ],
    "tiff.c714": [ "ForwardMatrix1?" ],
    "tiff.c715": [ "ForwardMatrix2?" ],
    "tiff.c716": [ "PreviewApplicationName?" ],
    "tiff.c717": [ "PreviewApplicationVersion?" ],
    "tiff.c718": [ "PreviewSettingsName?" ],
    "tiff.c719": [ "PreviewSettingsDigest?" ],
    "tiff.c71a": [ "PreviewColorSpace?" ],
    "tiff.c71b": [ "PreviewDateTime?" ],
    "tiff.c71c": [ "RawImageDigest?" ],
    "tiff.c71d": [ "OriginalRawFileDigest?" ],
    "tiff.c71e": [ "SubTileBlockSize?" ],
    "tiff.c71f": [ "RowInterleaveFactor?" ],
    "tiff.c725": [ "ProfileLookTableDims?" ],
    "tiff.c726": [ "ProfileLookTableData?" ],
    "tiff.c740": [ "OpcodeList1?" ],
    "tiff.c741": [ "OpcodeList2?" ],
    "tiff.c74e": [ "OpcodeList3?" ],
    "tiff.c761": [ "NoiseProfile?" ],
    "tiff.c763": [ "TimeCodes?" ],
    "tiff.c764": [ "FrameRate?" ],
    "tiff.c772": [ "TStop?" ],
    "tiff.c789": [ "ReelName?" ],
    "tiff.c791": [ "OriginalDefaultFinalSize?" ],
    "tiff.c792": [ "OriginalBestQualitySize?" ],
    "tiff.c793": [ "OriginalDefaultCropSize?" ],
    "tiff.c7a1": [ "CameraLabel?" ],
    "tiff.c7a3": [ "ProfileHueSatMapEncoding?" ],
    "tiff.c7a4": [ "ProfileLookTableEncoding?" ],
    "tiff.c7a5": [ "BaselineExposureOffset?" ],
    "tiff.c7a6": [ "DefaultBlackRender?" ],
    "tiff.c7a7": [ "NewRawImageDigest?" ],
    "tiff.c7a8": [ "RawToPreviewGain?" ],
    "tiff.c7aa": [ "CacheVersion?" ],
    "tiff.c7b5": [ "DefaultUserCrop?" ],
    "tiff.c7d5": [ "NikonNEFInfo?" ],
    "tiff.c7d7": [ "ZIFMetadata?" ],
    "tiff.c7d8": [ "ZIFAnnotations?" ],
    "tiff.c7e9": [ "DepthFormat?" ],
    "tiff.c7ea": [ "DepthNear?" ],
    "tiff.c7eb": [ "DepthFar?" ],
    "tiff.c7ec": [ "DepthUnits?" ],
    "tiff.c7ed": [ "DepthMeasureType?" ],
    "tiff.c7ee": [ "EnhanceParams?" ],
    "tiff.cd2d": [ "ProfileGainTableMap?" ],
    "tiff.cd2e": [ "SemanticName?" ],
    "tiff.cd30": [ "SemanticInstanceID?" ],
    "tiff.cd31": [ "CalibrationIlluminant3?" ],
    "tiff.cd32": [ "CameraCalibration3?" ],
    "tiff.cd33": [ "ColorMatrix3?" ],
    "tiff.cd34": [ "ForwardMatrix3?" ],
    "tiff.cd35": [ "IlluminantData1?" ],
    "tiff.cd36": [ "IlluminantData2?" ],
    "tiff.cd37": [ "IlluminantData3?" ],
    "tiff.cd38": [ "MaskSubArea?" ],
    "tiff.cd39": [ "ProfileHueSatMapData3?" ],
    "tiff.cd3a": [ "ReductionMatrix3?" ],
    "tiff.cd3f": [ "RGBTables?" ],
    "tiff.cd40": [ "ProfileGainTableMap2?" ],
    "tiff.cd41": [ "JUMBF?" ],
    "tiff.cd43": [ "ColumnInterleaveFactor?" ],
    "tiff.cd44": [ "ImageSequenceInfo?" ],
    "tiff.cd46": [ "ImageStats?" ],
    "tiff.cd47": [ "ProfileDynamicRange?" ],
    "tiff.cd48": [ "ProfileGroupName?" ],
    "tiff.cd49": [ "JXLDistance?" ],
    "tiff.cd4a": [ "JXLEffort?" ],
    "tiff.cd4b": [ "JXLDecodeSpeed?" ],
    "tiff.cea1": [ "SEAL?" ],
    "exif.829a": [ "ExposureTime", 5, 1, null, value => `1/${Math.ceil(value.denominator / value.numerator)}secs` ],
    "exif.829d": [ "FNumber", 5, 1 ],
    "exif.8822": [ "ExposureProgram", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Undefined`;
            break;

          case 1:
            value = `${value} - Manual`;
            break;

          case 2:
            value = `${value} - Normal program`;
            break;

          case 3:
            value = `${value} - Aperture priority`;
            break;

          case 4:
            value = `${value} - Shutter priority`;
            break;

          case 5:
            value = `${value} - Creative program`;
            break;

          case 6:
            value = `${value} - Action program`;
            break;

          case 7:
            value = `${value} - Portrait mode`;
            break;

          case 8:
            value = `${value} - Landscape mode`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.8824": [ "SpectralSensitivity", 2 ],
    "exif.8827": [ "PhotographicSensitivity", 3, null, null, value => (Array.isArray(value) ? value : [ value ]).join(", ") ],
    "exif.8828": [ "OECF", 7, null, "byteArray", value => "[OECF Matrix]" ],
    "exif.8830": [ "SensitivityType", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Unknown`;
            break;

          case 1:
            value = `${value} - SOS`;
            break;

          case 2:
            value = `${value} - REI`;
            break;

          case 3:
            value = `${value} - ISO`;
            break;

          case 4:
            value = `${value} - SOS and REI`;
            break;

          case 5:
            value = `${value} - SOS and ISO`;
            break;

          case 6:
            value = `${value} - REI and ISO`;
            break;

          case 7:
            value = `${value} - SOS, REI, and ISO`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.8831": [ "StandardOutputSensitivity", 4, 1 ],
    "exif.8832": [ "RecommendedExposureIndex", 4, 1 ],
    "exif.8833": [ "ISOSpeed", 4, 1 ],
    "exif.8834": [ "ISOSpeedLatitudeyyy", 4, 1 ],
    "exif.8835": [ "ISOSpeedLatitudezzz", 4, 1 ],
    "exif.9000": [ "ExifVersion", 7, 4, "asciiString" ],
    "exif.9003": [ "DateTimeOriginal", 2, 20 ],
    "exif.9004": [ "DateTimeDigitized", 2, 20 ],
    "exif.9010": [ "OffsetTime" ],
    "exif.9011": [ "OffsetTimeOriginal" ],
    "exif.9012": [ "OffsetTimeDigitized" ],
    "exif.9101": [ "ComponentsConfiguration", 7, 4, "byteArray", value => value.map(component => {
        switch (component) {
          case 0:
            return "-";

          case 1:
            return "Y";

          case 2:
            return "Cb";

          case 3:
            return "Cr";

          case 4:
            return "R";

          case 5:
            return "G";

          case 6:
            return "B";

          default:
            return "?";
        }
    }).join(", ") ],
    "exif.9102": [ "CompressedBitsPerPixel", 5, 1 ],
    "exif.9201": [ "ShutterSpeedValue", 10, 1, null, value => {
        if (Math.abs(value.toValue()) < 100) {
            const secs = 1 / Math.pow(2, value.toValue());
            value = `1/${(1 / secs).toFixed(0)}secs`;
        } else {
            value = `0secs`;
        }
        return value;
    } ],
    "exif.9202": [ "ApertureValue", 5, 1, null, value => Math.pow(2, value.toValue() / 2).toFixed(2) ],
    "exif.9203": [ "BrightnessValue", 10, 1 ],
    "exif.9204": [ "ExposureBiasValue", 10, 1 ],
    "exif.9205": [ "MaxApertureValue", 5, 1, null, value => Math.pow(2, value.toValue() / 2).toFixed(2) ],
    "exif.9206": [ "SubjectDistance", 5, 1, null, value => {
        if (value.numerator === 0) {
            value = `Unknwon`;
        } else if (value.denominator === 4294967295) {
            value = `Inifinity`;
        } else {
            value = `${value.toString(2)}m (${value.toString()})`;
        }
        return value;
    } ],
    "exif.9207": [ "MeteringMode", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Unknown`;
            break;

          case 1:
            value = `${value} - Average`;
            break;

          case 2:
            value = `${value} - CenterWeightedAverage`;
            break;

          case 3:
            value = `${value} - Spot`;
            break;

          case 4:
            value = `${value} - MultiSpot`;
            break;

          case 5:
            value = `${value} - Pattern`;
            break;

          case 6:
            value = `${value} - Partial`;
            break;

          case 255:
            value = `${value} - Other`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.9208": [ "LightSource", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Unknown`;
            break;

          case 1:
            value = `${value} - Daylight`;
            break;

          case 2:
            value = `${value} - Fluorescent`;
            break;

          case 3:
            value = `${value} - Tungsten (incandescent light)`;
            break;

          case 4:
            value = `${value} - Flash`;
            break;

          case 9:
            value = `${value} - Fine weather`;
            break;

          case 10:
            value = `${value} - Cloudy weather`;
            break;

          case 11:
            value = `${value} - Shade`;
            break;

          case 12:
            value = `${value} - Daylight fluorescent (D 5700 – 7100K)`;
            break;

          case 13:
            value = `${value} - Day white fluorescent (N 4600 – 5400K)`;
            break;

          case 14:
            value = `${value} - Cool white fluorescent (W 3900 – 4500K)`;
            break;

          case 15:
            value = `${value} - White fluorescent (WW 3200 – 3700K)`;
            break;

          case 17:
            value = `${value} - Standard light A`;
            break;

          case 18:
            value = `${value} - Standard light B`;
            break;

          case 19:
            value = `${value} - Standard light C`;
            break;

          case 20:
            value = `${value} - D55`;
            break;

          case 21:
            value = `${value} - D65`;
            break;

          case 22:
            value = `${value} - D75`;
            break;

          case 23:
            value = `${value} - D50`;
            break;

          case 24:
            value = `${value} - ISO studio tungsten`;
            break;

          case 255:
            value = `${value} - Other light source`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.9209": [ "Flash", 3, 1, null, value => {
        const redEyeMode = !!(value & 64);
        const flashDisabled = !!(value & 32);
        const flashMode = value >> 3 & 3;
        const flashReturned = value >> 1 & 3;
        const flashed = !!(value & 1);
        const result = [];
        if (flashed) {
            result.push("Flash fired");
        }
        switch (flashReturned) {
          case 0:
            result.push("No flash return detection");
            break;

          case 1:
            result.push("Unknown flash return detection state");
            break;

          case 2:
            result.push("Flash return not detected");
            break;

          case 3:
            result.push("Flash return detected");
            break;
        }
        switch (flashMode) {
          case 0:
            result.push("Unknown flash mode");
            break;

          case 1:
            result.push("Flash mode: ON");
            break;

          case 2:
            result.push("Flash mode: OFF");
            break;

          case 3:
            result.push("Flash mode: Auto");
            break;
        }
        if (flashDisabled) {
            result.push("No flash function");
        }
        if (redEyeMode) {
            result.push("Red-eye reduction: ON");
        }
        value = `${value} - ${result.join(", ")}`;
        return value;
    } ],
    "exif.920a": [ "FocalLength", 5, 1, null, value => `${value.toString(2)}mm` ],
    "exif.9214": [ "SubjectArea", 3, [ 2, 3, 4 ], null, value => {
        switch (value.length) {
          case 2:
            value = `suject is located at ${value[0]}, ${value[1]}`;
            break;

          case 3:
            value = `subject is located within a cirlce centered at ${value[0]}, ${value[1]} with radius ${value[2]}`;
            break;

          case 4:
            value = `subject is located within a rectangle centered at ${value[0]}, ${value[1]} with width ${value[2]} and height ${value[3]}`;
            break;
        }
        return value;
    } ],
    "exif.927c": [ "MakerNote", 7, null, null, value => `[Maker Note ${value.length} bytes data]` ],
    "exif.9286": [ "UserComment", 7, null, "i18nString" ],
    "exif.9290": [ "SubSecTime", 2 ],
    "exif.9291": [ "SubSecTimeOriginal", 2 ],
    "exif.9292": [ "SubSecTimeDigitized", 2 ],
    "exif.a000": [ "FlashpixVersion", 7, 4, "asciiString" ],
    "exif.a001": [ "ColorSpace", 3, 1, null, value => {
        switch (value) {
          case 1:
            value = `${value} - sRGB`;
            break;

          case 65535:
            value = `${value} - Uncalibrated`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a002": [ "PixelXDimension", [ 3, 4 ], 1 ],
    "exif.a003": [ "PixelYDimension", [ 3, 4 ], 1 ],
    "exif.a004": [ "RelatedSoundFile", 2, 13 ],
    "exif.a005": [ "InteroperabilityIFDPointer", 4, 1 ],
    "exif.a20b": [ "FlashEnergy", 5, 1 ],
    "exif.a20c": [ "SpatialFrequencyResponse", 7, null, null, value => "[SFR Matrix]" ],
    "exif.a20e": [ "FocalPlaneXResolution", 5, 1 ],
    "exif.a20f": [ "FocalPlaneYResolution", 5, 1 ],
    "exif.a210": [ "FocalPlaneResolutionUnit", 3, 1, null, value => {
        switch (value) {
          case 2:
            value = `${value} - inches`;
            break;

          case 3:
            value = `${value} - centimeters`;
            break;

          default:
            value = `${value} - reserved`;
            break;
        }
        return value;
    } ],
    "exif.a214": [ "SubjectLocation", 3, 2, null, value => `subject is located at ${value[0]}, ${value[1]}` ],
    "exif.a215": [ "ExposureIndex", 5, 1 ],
    "exif.a217": [ "SensingMethod", 3, 1, null, value => {
        switch (value) {
          case 1:
            value = `${value} - Undefined`;
            break;

          case 2:
            value = `${value} - One-chip color area sensor`;
            break;

          case 3:
            value = `${value} - Two-chip color area sensor`;
            break;

          case 4:
            value = `${value} - Three-chip color area sensor`;
            break;

          case 5:
            value = `${value} - Color sequential area sensor`;
            break;

          case 7:
            value = `${value} - Trilinear sensor`;
            break;

          case 8:
            value = `${value} - Color sequential linear sensor`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a300": [ "FileSource", 7, 1, "byteArray", value => {
        switch (value) {
          case 0:
            value = `${value} - Other`;
            break;

          case 1:
            value = `${value} - Transparency scanner`;
            break;

          case 2:
            value = `${value} - Reflective scanner`;
            break;

          case 3:
            value = `${value} - Digital still camera`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a301": [ "SceneType", 7, 1, "byteArray", value => {
        switch (value) {
          case 1:
            value = `${value} - A directly photographed image`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a302": [ "CFAPattern", 7, null, null, (value, isLittleEndian) => {
        const bytes = new Uint8Array(value);
        const view = new DataViewWrap(bytes.buffer, isLittleEndian);
        if (view.byteLength >= 4) {
            const width = view.load2();
            const height = view.load2();
            if (view.byteLength - view.position >= width * height) {
                const rows = [];
                for (let y = 0; y < height; y++) {
                    const cols = [];
                    for (let x = 0; x < width; x++) {
                        switch (view.load1()) {
                          case 0:
                            cols.push("Red");
                            break;

                          case 1:
                            cols.push("Green");
                            break;

                          case 2:
                            cols.push("Blue");
                            break;

                          case 3:
                            cols.push("Cyan");
                            break;

                          case 4:
                            cols.push("Magenta");
                            break;

                          case 5:
                            cols.push("Yellow");
                            break;

                          case 6:
                            cols.push("White");
                            break;

                          default:
                            cols.push("?");
                            break;
                        }
                    }
                    rows.push(cols.join(","));
                }
                value = `[${rows.join("][")}]`;
            } else {
                throw new Error("invalid CFA Matrix: insufficient BYTE sequence for CFA filter");
            }
        } else {
            throw new Error("invalid CFA Matrix: insufficient SHORT sequence for matrix size");
        }
        return value;
    } ],
    "exif.a401": [ "CustomRendered", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Normal process`;
            break;

          case 1:
            value = `${value} - Custom process`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a402": [ "ExposureMode", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Auto exposure`;
            break;

          case 1:
            value = `${value} - Manual exposure`;
            break;

          case 2:
            value = `${value} - Auto bracket`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a403": [ "WhiteBalance", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Auto white balance`;
            break;

          case 1:
            value = `${value} - Manual white balance`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a404": [ "DigitalZoomRatio", 5, 1, null, value => value === 0 ? `${value} - Digital zoom not used` : value ],
    "exif.a405": [ "FocalLengthIn35mmFilm", 3, 1, null, value => {
        if (value === 0) {
            value = `${value} - Unknown focal length`;
        } else {
            value = `${value}mm`;
        }
        return value;
    } ],
    "exif.a406": [ "SceneCaptureType", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Standard`;
            break;

          case 1:
            value = `${value} - Landscape`;
            break;

          case 2:
            value = `${value} - Portrait`;
            break;

          case 3:
            value = `${value} - Night scene`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a407": [ "GainControl", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - None`;
            break;

          case 1:
            value = `${value} - Low gain up`;
            break;

          case 2:
            value = `${value} - High gain up`;
            break;

          case 3:
            value = `${value} - Low gain down`;
            break;

          case 4:
            value = `${value} - High gain down`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a408": [ "Contrast", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Normal`;
            break;

          case 1:
            value = `${value} - Soft`;
            break;

          case 2:
            value = `${value} - Hard`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a409": [ "Saturation", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Normal`;
            break;

          case 1:
            value = `${value} - Low saturation`;
            break;

          case 2:
            value = `${value} - High saturation`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a40a": [ "Sharpness", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Normal`;
            break;

          case 1:
            value = `${value} - Soft`;
            break;

          case 2:
            value = `${value} - Hard`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a40b": [ "DeviceSettingDescription", 7, null, null, value => "[Device Setting Description]" ],
    "exif.a40c": [ "SubjectDistanceRange", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Unknwon`;
            break;

          case 1:
            value = `${value} - Macro`;
            break;

          case 2:
            value = `${value} - Close view`;
            break;

          case 3:
            value = `${value} - Distant view`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "exif.a420": [ "ImageUniqueID", 2, 33 ],
    "exif.a430": [ "CameraOwnerName", 2 ],
    "exif.a431": [ "BodySerialNumber", 2 ],
    "exif.a432": [ "LensSpecification", 5, 4, null, value => {
        const mapped = value.map(v => {
            const n = v.toValue();
            return isNaN(n) || !isFinite(n) ? "?" : v.toString(2);
        });
        let result = mapped[0];
        if (mapped[1] && mapped[1] !== mapped[0]) {
            result += `-${mapped[1]}`;
        }
        result += `mm f/${mapped[2]}`;
        if (mapped[3] && mapped[3] !== mapped[2]) {
            result += `-${mapped[3]}`;
        }
        return result;
    } ],
    "exif.a433": [ "LensMake", 2 ],
    "exif.a434": [ "LensModel", 2 ],
    "exif.a435": [ "LensSerialNumber", 2 ],
    "exif.a500": [ "Gamma", 5, 1 ],
    "exif.ea1c": [ "Padding?" ],
    "exif.ea1d": [ "OffsetSchema?" ],
    "exif.fde8": [ "OwnerName?" ],
    "exif.fde9": [ "SerialNumber?" ],
    "exif.fdea": [ "Lens?" ],
    "exif.fe00": [ "KDC_IFD?" ],
    "exif.fe4c": [ "RawFile?" ],
    "exif.fe4d": [ "Converter?" ],
    "exif.fe4e": [ "WhiteBalance?" ],
    "exif.fe51": [ "Exposure?" ],
    "exif.fe52": [ "Shadows?" ],
    "exif.fe53": [ "Brightness?" ],
    "exif.fe54": [ "Contrast?" ],
    "exif.fe55": [ "Saturation?" ],
    "exif.fe56": [ "Sharpness?" ],
    "exif.fe57": [ "Smoothness?" ],
    "exif.fe58": [ "MoireFilter?" ],
    "gps.0000": [ "GPSVersionID", 1, 4, null, value => `${value[0]}.${value[1]}.${value[2]}.${value[3]}` ],
    "gps.0001": [ "GPSLatitudeRef", 2, 2, null, value => {
        switch (value) {
          case "N":
            value = `${value} - North latitude`;
            break;

          case "S":
            value = `${value} - South latitude`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.0002": [ "GPSLatitude", 5, 3, null, value => {
        const decimal = (value[0].toValue() || 0) + (value[1].toValue() || 0) / 60 + (value[2].toValue() || 0) / 3600;
        const degree = Math.trunc(decimal);
        const minute = Math.trunc((decimal - degree) * 60);
        const second = ((decimal - degree) * 60 - minute) * 60;
        const dms = [ `${degree}°`, `${minute}′`, `${second.toFixed(2)}″` ].join("");
        value = [ `${decimal.toFixed(2)}°`, dms, decimal ];
        return value;
    } ],
    "gps.0003": [ "GPSLongitudeRef", 2, 2, null, value => {
        switch (value) {
          case "E":
            value = `${value} - East longitude`;
            break;

          case "W":
            value = `${value} - West longitude`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.0004": [ "GPSLongitude", 5, 3, null, value => exifTagProps["gps.0002"][4](value) ],
    "gps.0005": [ "GPSAltitudeRef", 1, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Higher than sea level`;
            break;

          case 1:
            value = `${value} - Lower than sea level`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.0006": [ "GPSAltitude", 5, 1, null, value => `${value.toString(2)}m` ],
    "gps.0007": [ "GPSTimeStamp", 5, 3, null, value => value.map(a => ("" + Math.floor(a.numerator / a.denominator)).padStart(2, "0")).join(":") ],
    "gps.0008": [ "GPSSatellites", 2 ],
    "gps.0009": [ "GPSStatus", 2, 2, null, value => {
        switch (value) {
          case "A":
            value = `${value} - Measurement in progress`;
            break;

          case "V":
            value = `${value} - Measurement Interoperability`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.000a": [ "GPSMeasureMode", 2, 2, null, value => {
        switch (value) {
          case "2":
            value = `${value} - 2-dimensional measurement`;
            break;

          case "3":
            value = `${value} - 3-dimensional measurement`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.000b": [ "GPSDOP", 5, 1 ],
    "gps.000c": [ "GPSSpeedRef", 2, 2, null, value => {
        switch (value) {
          case "K":
            value = `${value} - Kilometers per hour`;
            break;

          case "M":
            value = `${value} - Miles per hour`;
            break;

          case "N":
            value = `${value} - Knots`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.000d": [ "GPSSpeed", 5, 1 ],
    "gps.000e": [ "GPSTrackRef", 2, 2, null, value => {
        switch (value) {
          case "T":
            value = `${value} - True bearing`;
            break;

          case "M":
            value = `${value} - Magnetic bearing`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.000f": [ "GPSTrack", 5, 1 ],
    "gps.0010": [ "GPSImgDirectionRef", 2, 2, null, value => {
        switch (value) {
          case "T":
            value = `${value} - True bearing`;
            break;

          case "M":
            value = `${value} - Magnetic bearing`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.0011": [ "GPSImgDirection", 5, 1 ],
    "gps.0012": [ "GPSMapDatum", 2 ],
    "gps.0013": [ "GPSDestLatitudeRef", 2, 2, null, value => {
        switch (value) {
          case "N":
            value = `${value} - North latitude`;
            break;

          case "S":
            value = `${value} - South latitude`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.0014": [ "GPSDestLatitude", 5, 3, null, value => exifTagProps["gps.0002"][4](value) ],
    "gps.0015": [ "GPSDestLongitudeRef", 2, 2, null, value => {
        switch (value) {
          case "E":
            value = `${value} - East longitude`;
            break;

          case "W":
            value = `${value} - West longitude`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.0016": [ "GPSDestLongitude", 5, 3, null, value => exifTagProps["gps.0002"][4](value) ],
    "gps.0017": [ "GPSDestBearingRef", 2, 2, null, value => {
        switch (value) {
          case "T":
            value = `${value} - True bearing`;
            break;

          case "M":
            value = `${value} - Magnetic bearing`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.0018": [ "GPSDestBearing", 5, 1 ],
    "gps.0019": [ "GPSDestDistanceRef", 2, 2, null, value => {
        switch (value) {
          case "K":
            value = `${value} - Kilometers per hour`;
            break;

          case "M":
            value = `${value} - Miles per hour`;
            break;

          case "N":
            value = `${value} - Knots`;
            break;

          case "":
            value = `"" - Reserved`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.001a": [ "GPSDestDistance", 5, 1 ],
    "gps.001b": [ "GPSProcessingMethod", 7, null, "i18nString" ],
    "gps.001c": [ "GPSAreaInformation", 7, null, "i18nString" ],
    "gps.001d": [ "GPSDateStamp", 2, 11 ],
    "gps.001e": [ "GPSDifferential", 3, 1, null, value => {
        switch (value) {
          case 0:
            value = `${value} - Measurement without differential correction`;
            break;

          case 1:
            value = `${value} - Differential correction applied`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "gps.001f": [ "GPSHPositioningError", 5, 1, null, value => {
        value = `${value.toString(2)}m`;
        return value;
    } ],
    "interop.0001": [ "InteroperabilityIndex", 2, null, null, value => {
        switch (value) {
          case "R98":
            value = `${value} - DCF Basic file`;
            break;

          case "THM":
            value = `${value} - DCF Thumbnail file`;
            break;

          case "R03":
            value = `${value} - DCF Optional file`;
            break;

          default:
            value = `${value} - Reserved`;
            break;
        }
        return value;
    } ],
    "interop.0002": [ "InteroperabilityVersion", 7, null, "asciiString" ],
    "interop.1000": [ "RelatedImageFileFormat" ],
    "interop.1001": [ "RelatedImageWidth" ],
    "interop.1002": [ "RelatedImageLength" ]
};

class Rational {
    #numerator;
    #denominator;
    v;
    /**
	 * @constructor
	 * @param {number} numerator
	 * @param {number} denominator
	 * @returns {Rational}
	 */
    constructor(numerator, denominator) {
        this.#numerator = numerator;
        this.#denominator = denominator;
        this.v = `${this.toString(2)} (${this.toString()})`;
    }
    /**
	 * @returns {number}
	 */    get numerator() {
        return this.#numerator;
    }
    /**
	 * @returns {number}
	 */    get denominator() {
        return this.#denominator;
    }
    /**
	 * @param {number} value
	 * @returns {string}
	 */    static toRoundString(value) {
        value = "" + value;
        value = value.replace(/0{2,}$/, "0");
        value = value.replace(/0$/, "");
        value = value.replace(/\.$/, "");
        return value;
    }
    /**
	 * @param {?number} precision
	 * @returns {number|string}
	 */    toValue(precision) {
        if (typeof precision === "number") {
            return (this.#numerator / this.#denominator).toFixed(precision);
        } else {
            return this.#numerator / this.#denominator;
        }
    }
    /**
	 * @param {?number} precision
	 * @returns {string}
	 */    toString(precision) {
        if (typeof precision === "number") {
            if (this.#denominator === 1) {
                return "" + this.#numerator;
            }
            return Rational.toRoundString(this.toValue(precision));
        } else {
            return `${this.#numerator}/${this.#denominator}`;
        }
    }
}

class DataViewWrap {
    #isLittleEndian;
    #view;
    #position;
    #loadByte(pointer, size = 1, tagProps) {
        const pos = size <= 4 ? pointer : this.load4(pointer);
        let result = [];
        for (let i = 0; i < size; i++) {
            result.push(this.load1(pos + i));
        }
        return size === 1 && Array.isArray(tagProps) ? result[0] : result;
    }
    #loadAscii(pointer, size = 1) {
        const pos = size <= 4 ? pointer : this.load4(pointer);
        let result = "";
        for (let i = 0; i < size; i++) {
            result += String.fromCharCode(this.load1(pos + i));
        }
        return result.replace(/\x00+$/, "").replace(/[^\x09\x0d\x0a\x20-\x7e]/g, $0 => `<${$0.charCodeAt(0).toString(16).padStart(2, "0")}>`);
    }
    #loadShort(pointer, size = 1, tagProps) {
        const pos = size <= 2 ? pointer : this.load4(pointer);
        let result = [];
        for (let i = 0; i < size; i++) {
            result.push(this.load2(pos + i * 2));
        }
        return size === 1 && Array.isArray(tagProps) ? result[0] : result;
    }
    #loadLong(pointer, size = 1, tagProps) {
        const pos = size <= 1 ? pointer : this.load4(pointer);
        let result = [];
        for (let i = 0; i < size; i++) {
            result.push(this.load4(pos + i * 4));
        }
        return size === 1 && Array.isArray(tagProps) ? result[0] : result;
    }
    #loadRational(pointer, size = 1, tagProps) {
        const pos = this.load4(pointer);
        let result = [];
        for (let i = 0; i < size; i++) {
            result.push(new Rational(this.load4(pos + i * 8), this.load4(pos + i * 8 + 4)));
        }
        return size === 1 && Array.isArray(tagProps) ? result[0] : result;
    }
    #loadUndefined(pointer, size = 1, tagProps) {
        let result;
        switch (tagProps?.[3] ?? "byteArray") {
          case "byteArray":
            result = this.#loadByte(pointer, size);
            break;

          case "asciiString":
            result = this.#loadAscii(pointer, size);
            break;

          case "i18nString":
            {
                const pos = this.load4(pointer);
                if (pos + size > this.#view.byteLength) {
                    throw new Error(`failed to read ${size} bytes data. offset ${pos} exceeds the buffer range`);
                }
                const encodingHint = this.#loadAscii(pointer, 8).replace(/\x00+$/, "").toLowerCase();
                if (encodingHint === "ascii") ; else if (encodingHint === "jis") ; else if (encodingHint === "unicode") {
                    this.#isLittleEndian ? "utf-16le" : "utf-16be";
                }
                const decoded = detectEncoding(new Uint8Array(this.#view.buffer, this.#view.byteOffset + pos + 8, size - 8), {});
                if (decoded) {
                    result = decoded.result.replace(/\x00+$/, "");
                }
            }
            break;

          default:
            throw new Error(`unknown actual type for UNDEFINED: ${detail}`);
        }
        return size === 1 && Array.isArray(tagProps) ? result[0] : result;
    }
    #loadSignedLong(pointer, size = 1, tagProps) {
        const pos = size <= 1 ? pointer : this.load4(pointer);
        let result = [];
        for (let i = 0; i < size; i++) {
            result.push(this.load4(pos + i * 4, true));
        }
        return size === 1 && Array.isArray(tagProps) ? result[0] : result;
    }
    #loadSignedRational(pointer, size = 1, tagProps) {
        const pos = this.load4(pointer);
        let result = [];
        for (let i = 0; i < size; i++) {
            result.push(new Rational(this.load4(pos + i * 8, true), this.load4(pos + i * 8 + 4, true)));
        }
        return size === 1 && Array.isArray(tagProps) ? result[0] : result;
    }
    #tagValueNames={
        1: "BYTE",
        2: "ASCII",
        3: "SHORT",
        4: "LONG",
        5: "RATIONAL",
        7: "UNDEFINED",
        9: "SLONG",
        10: "SRATIONAL"
    };
    #tagValueHandlers={
        1: this.#loadByte,
        2: this.#loadAscii,
        3: this.#loadShort,
        4: this.#loadLong,
        5: this.#loadRational,
        7: this.#loadUndefined,
        9: this.#loadSignedLong,
        10: this.#loadSignedRational
    };
    constructor(arraybuffer, isLittleEndian, position = 0, bufferOffset = 0) {
        this.#isLittleEndian = isLittleEndian;
        this.#position = position;
        this.#view = new DataView(arraybuffer, bufferOffset);
    }
    load1(offset = null, signed = false) {
        const actualOffset = offset ?? this.#position;
        if (actualOffset + 1 > this.#view.byteLength) {
            throw new Error(`failed to read 2 bytes data. offset ${actualOffset} exceeds the buffer range`);
        }
        const result = signed ? this.#view.getInt8(actualOffset) : this.#view.getUint8(actualOffset);
        if (offset === null) {
            this.#position += 1;
        }
        return result;
    }
    load2(offset = null, signed = false) {
        const actualOffset = offset ?? this.#position;
        if (actualOffset + 2 > this.#view.byteLength) {
            throw new Error(`failed to read 2 bytes data. offset ${actualOffset} exceeds the buffer range`);
        }
        const result = signed ? this.#view.getInt16(actualOffset, this.#isLittleEndian) : this.#view.getUint16(actualOffset, this.#isLittleEndian);
        if (offset === null) {
            this.#position += 2;
        }
        return result;
    }
    load4(offset = null, signed = false) {
        const actualOffset = offset ?? this.#position;
        if (actualOffset + 4 > this.#view.byteLength) {
            throw new Error(`failed to read 4 bytes data. offset ${actualOffset} exceeds the buffer range`);
        }
        const result = signed ? this.#view.getInt32(actualOffset, this.#isLittleEndian) : this.#view.getUint32(actualOffset, this.#isLittleEndian);
        if (offset === null) {
            this.#position += 4;
        }
        return result;
    }
    jumpto(offset, label = "") {
        if (offset < 8 || offset > this.#view.byteLength) {
            console.error(`failed to jump to ${label} IFD. offset ${offset} exceeds the buffer range 0-${this.#view.byteLength - 1}.`);
            return false;
        }
        this.#position = offset;
        return true;
    }
    isValidTagValueType(valueType) {
        return valueType in this.#tagValueNames;
    }
    tagValueHandler(valueType) {
        if (this.isValidTagValueType(valueType)) {
            const name = this.#tagValueNames[valueType];
            const loader = this.#tagValueHandlers[valueType];
            return {
                valueType: valueType,
                name: name,
                load: loader.bind(this)
            };
        } else {
            throw new Error(`failed to get tag value handler for type ${valueType}`);
        }
    }
    get position() {
        return this.#position;
    }
    set position(pos) {
        this.#position = pos;
    }
    get byteLength() {
        return this.#view.byteLength;
    }
}

/**
 * Extracts the exif tags from buffer
 *
 * @param {ArrayBuffer} arraybuffer
 * @returns {object}
 */ function getExifTags(arraybuffer) {
    let isLittleEndian = null;
    let bufferOffset = 0;
    let view = new Uint8Array(arraybuffer);
    if (view.length >= EXIF_SEGMENT_HEADER_SIZE_BYTES && view[0] === 69 && view[1] === 120 && view[2] === 105 && view[3] === 102 && view[4] === 0 && view[5] === 0) {
        bufferOffset = EXIF_SEGMENT_HEADER_SIZE_BYTES;
    }
    if (view.length >= bufferOffset + 4) {
        if (view[bufferOffset] === 73 && view[bufferOffset + 1] === 73 && view[bufferOffset + 2] === 42 && view[bufferOffset + 3] === 0) {
            isLittleEndian = true;
        } else if (view[bufferOffset] === 77 && view[bufferOffset + 1] === 77 && view[bufferOffset + 2] === 0 && view[bufferOffset + 3] === 42) {
            isLittleEndian = false;
        }
    }
    if (isLittleEndian === null) {
        console.log("invalid exif header: ");
        dump(new DataView(arraybuffer), 0, 10);
        return null;
    }
    view = new DataViewWrap(arraybuffer, isLittleEndian, 4, bufferOffset);
    try {
        if (!view.jumpto(view.load4(), "0th IFD")) {
            throw new Error("failed to jump to 0th IFD");
        }
        const PARSE_IFD_MAX = 10;
        const TAG_MAX = 100;
        const result = {};
        const IFDs = [ {
            startPos: view.position,
            name: "Image",
            prefix: "tiff"
        } ];
        const processedIFDs = new Set;
        const queueNextIFD = nextIFD => {
            if (IFDs.some(IFD => IFD.startPos === nextIFD.startPos)) {
                throw new Error("Attempting to register the same address as an IFD awaiting parsing. maybe a malformed data.");
            }
            IFDs.push(nextIFD);
        };
        const isAlreadyProcessed = nextIFD => processedIFDs.has(nextIFD.startPos);
        const pushWarning = message => {
            if (!Array.isArray(result["*warning*"])) {
                result["*warning*"] = [];
            }
            result["*warning*"].push(message);
        };
        result["*byteOrder*"] = isLittleEndian ? "Little-endian" : "Big-endian";
        while (IFDs.length && processedIFDs.size < PARSE_IFD_MAX) {
            const IFD = IFDs.shift();
            if (isAlreadyProcessed(IFD)) {
                pushWarning("Attempting to parse that has already been parsed.");
                continue;
            }
            processedIFDs.add(IFD.startPos);
            if (!view.jumpto(IFD.startPos, IFD.name)) {
                pushWarning(`Failed to jump to ${IFD.name} IFD at ${IFD.startPos}`);
                continue;
            }
            const numberOfTags = view.load2();
            if (numberOfTags > TAG_MAX) {
                pushWarning("The number of tags exceeded the limit.");
                continue;
            }
            if (view.position + numberOfTags * 12 > view.byteLength) {
                pushWarning("The number of tags exceeded the buffer range.");
                continue;
            }
            for (let i = 0; i < numberOfTags; i++) {
                const tagID = view.load2();
                let valueType = view.load2();
                const numberOfValues = view.load4();
                const offsetPos = view.position;
                view.position += 4;
                const tagIDregalized = `${IFD.prefix}.${tagID.toString(16).padStart(4, "0")}`;
                const tagProps = exifTagProps[tagIDregalized] ?? [ `0x${tagID.toString(16).padStart(4, "0")}` ];
                if (!view.isValidTagValueType(valueType)) {
                    result[`${IFD.name}.${tagProps[0]}`] = `mmmf warning: invalid value type: ${valueType}`;
                    continue;
                }
                const acceptableTypes = Array.isArray(tagProps[1]) ? tagProps[1] : typeof tagProps[1] === "number" ? [ tagProps[1] ] : null;
                if (acceptableTypes && !acceptableTypes.includes(valueType)) {
                    const warningMessage = `type mismatch. expected: ${acceptableTypes}, actual: ${valueType}`;
                    if (acceptableTypes.includes(7) && tagProps[3] === "i18nString" && valueType === 2 || acceptableTypes.includes(3) && valueType === 4) {
                        pushWarning(`mmmf warning: ${IFD.name}.${tagProps[0]}: ${warningMessage}`);
                    } else {
                        result[`${IFD.name}.${tagProps[0]}`] = `mmmf warning: ${warningMessage}`;
                        continue;
                    }
                }
                const acceptableNumberOfValues = Array.isArray(tagProps[2]) ? tagProps[2] : typeof tagProps[2] === "number" ? [ tagProps[2] ] : null;
                if (acceptableNumberOfValues && !acceptableNumberOfValues.includes(numberOfValues)) {
                    const warningMessage = `count mismatch. expected: ${tagProps[2]}, actual: ${numberOfValues}`;
                    result[`${IFD.name}.${tagProps[0]}`] = `mmmf warning: ${warningMessage}`;
                    continue;
                }
                let value = view.tagValueHandler(valueType).load(offsetPos, numberOfValues, tagProps);
                if (typeof tagProps[4] === "function") {
                    try {
                        value = tagProps[4](value, isLittleEndian) ?? value;
                    } catch (err) {
                        value = `mmmf warning: ${err.message}`;
                    }
                }
                if (Array.isArray(value)) {
                    for (let i = 0; i < value.length; i++) {
                        if (value[i] instanceof Rational) {
                            value[i] = `${value[i].toString(2)} (${value[i].toString()})`;
                        }
                    }
                } else if (value instanceof Rational) {
                    value = `${value.toString(2)} (${value.toString()})`;
                }
                switch (tagIDregalized) {
                  case "tiff.8769":
                    queueNextIFD({
                        startPos: value,
                        name: `${IFD.name}.Exif`,
                        prefix: "exif"
                    });
                    break;

                  case "tiff.8825":
                    queueNextIFD({
                        startPos: value,
                        name: `${IFD.name}.GPS`,
                        prefix: "gps"
                    });
                    break;

                  case "exif.a005":
                    queueNextIFD({
                        startPos: value,
                        name: `${IFD.name}.Interoperability`,
                        prefix: "interop"
                    });
                    break;

                  default:
                    result[`${IFD.name}.${tagProps[0]}`] = value;
                }
            }
            const offsetToNextIFD = view.load4();
            if (offsetToNextIFD > 0) {
                queueNextIFD({
                    startPos: offsetToNextIFD,
                    name: `Thumbnail`,
                    prefix: "tiff"
                });
            }
        }
        if (processedIFDs.size > PARSE_IFD_MAX) {
            pushWarning(`The number of processed IFDs has exceeded the limit.`);
        }
        return result;
    } catch (err) {
        console.error(err);
        return null;
    }
}

(function initializeExifTagProps() {
    for (const key of Object.keys(exifTagProps)) {
        if (/^exif\.[0-9a-f]+$/.test(key)) {
            const delegatedKey = key.replace("exif", "tiff");
            if (!(delegatedKey in exifTagProps)) {
                const delegatedValue = [ exifTagProps[key][0] + "<wrong position>" ];
                for (let i = 1; i < exifTagProps[key].length; i++) {
                    delegatedValue.push(exifTagProps[key][i]);
                }
                exifTagProps[delegatedKey] = delegatedValue;
            } else {
                console.log(`${delegatedKey} is already exists, skipping...`);
            }
        }
    }
})();

/**
 * parseXML / html into a DOM Object. with no validation and some failur tolerance
 * @param {string} S your XML to parse
 * @param {TParseOptions} [options]  all other options:
 * @return {(tNode | string)[]}
 */ function parse(S, options) {
    "txml";
    options = options || {};
    var pos = options.pos || 0;
    var keepComments = !!options.keepComments;
    var keepWhitespace = !!options.keepWhitespace;
    var openBracket = "<";
    var openBracketCC = "<".charCodeAt(0);
    var closeBracket = ">";
    var closeBracketCC = ">".charCodeAt(0);
    var minusCC = "-".charCodeAt(0);
    var slashCC = "/".charCodeAt(0);
    var exclamationCC = "!".charCodeAt(0);
    var singleQuoteCC = "'".charCodeAt(0);
    var doubleQuoteCC = '"'.charCodeAt(0);
    var openCornerBracketCC = "[".charCodeAt(0);
    var closeCornerBracketCC = "]".charCodeAt(0);
    function parseChildren(tagName) {
        var children = [];
        while (S[pos]) {
            if (S.charCodeAt(pos) == openBracketCC) {
                if (S.charCodeAt(pos + 1) === slashCC) {
                    var closeStart = pos + 2;
                    pos = S.indexOf(closeBracket, pos);
                    var closeTag = S.substring(closeStart, pos);
                    if (closeTag.indexOf(tagName) == -1) {
                        var parsedText = S.substring(0, pos).split("\n");
                        throw new Error("Unexpected close tag\nLine: " + (parsedText.length - 1) + "\nColumn: " + (parsedText[parsedText.length - 1].length + 1) + "\nChar: " + S[pos]);
                    }
                    if (pos + 1) pos += 1;
                    return children;
                } else if (S.charCodeAt(pos + 1) === exclamationCC) {
                    if (S.charCodeAt(pos + 2) == minusCC) {
                        const startCommentPos = pos;
                        while (pos !== -1 && !(S.charCodeAt(pos) === closeBracketCC && S.charCodeAt(pos - 1) == minusCC && S.charCodeAt(pos - 2) == minusCC && pos != -1)) {
                            pos = S.indexOf(closeBracket, pos + 1);
                        }
                        if (pos === -1) {
                            pos = S.length;
                        }
                        if (keepComments) {
                            children.push(S.substring(startCommentPos, pos + 1));
                        }
                    } else if (S.charCodeAt(pos + 2) === openCornerBracketCC && S.charCodeAt(pos + 8) === openCornerBracketCC && S.substr(pos + 3, 5).toLowerCase() === "cdata") {
                        var cdataEndIndex = S.indexOf("]]>", pos);
                        if (cdataEndIndex == -1) {
                            children.push(S.substr(pos + 9));
                            pos = S.length;
                        } else {
                            children.push(S.substring(pos + 9, cdataEndIndex));
                            pos = cdataEndIndex + 3;
                        }
                        continue;
                    } else {
                        const startDoctype = pos + 1;
                        pos += 2;
                        var encapsuled = false;
                        while ((S.charCodeAt(pos) !== closeBracketCC || encapsuled === true) && S[pos]) {
                            if (S.charCodeAt(pos) === openCornerBracketCC) {
                                encapsuled = true;
                            } else if (encapsuled === true && S.charCodeAt(pos) === closeCornerBracketCC) {
                                encapsuled = false;
                            }
                            pos++;
                        }
                        children.push(S.substring(startDoctype, pos));
                    }
                    pos++;
                    continue;
                }
                var node = parseNode();
                children.push(node);
                if (node.tagName[0] === "?") {
                    children.push(...node.children);
                    node.children = [];
                }
            } else {
                var text = parseText();
                if (keepWhitespace) {
                    if (text.length > 0) {
                        children.push(text);
                    }
                } else {
                    var trimmed = text.trim();
                    if (trimmed.length > 0) {
                        children.push(trimmed);
                    }
                }
                pos++;
            }
        }
        return children;
    }
    function parseText() {
        var start = pos;
        pos = S.indexOf(openBracket, pos) - 1;
        if (pos === -2) pos = S.length;
        return S.slice(start, pos + 1);
    }
    var nameSpacer = "\r\n\t>/= ";
    function parseName() {
        var start = pos;
        while (nameSpacer.indexOf(S[pos]) === -1 && S[pos]) {
            pos++;
        }
        return S.slice(start, pos);
    }
    var NoChildNodes = options.noChildNodes || [ "img", "br", "input", "meta", "link", "hr" ];
    function parseNode() {
        pos++;
        const tagName = parseName();
        const attributes = {};
        let children = [];
        while (S.charCodeAt(pos) !== closeBracketCC && S[pos]) {
            var c = S.charCodeAt(pos);
            if (c > 64 && c < 91 || c > 96 && c < 123) {
                var name = parseName();
                var code = S.charCodeAt(pos);
                while (code && code !== singleQuoteCC && code !== doubleQuoteCC && !(code > 64 && code < 91 || code > 96 && code < 123) && code !== closeBracketCC) {
                    pos++;
                    code = S.charCodeAt(pos);
                }
                if (code === singleQuoteCC || code === doubleQuoteCC) {
                    var value = parseString();
                    if (pos === -1) {
                        return {
                            tagName: tagName,
                            attributes: attributes,
                            children: children
                        };
                    }
                } else {
                    value = null;
                    pos--;
                }
                attributes[name] = value;
            }
            pos++;
        }
        if (S.charCodeAt(pos - 1) !== slashCC) {
            if (tagName == "script") {
                var start = pos + 1;
                pos = S.indexOf("<\/script>", pos);
                children = [ S.slice(start, pos) ];
                pos += 9;
            } else if (tagName == "style") {
                var start = pos + 1;
                pos = S.indexOf("</style>", pos);
                children = [ S.slice(start, pos) ];
                pos += 8;
            } else if (NoChildNodes.indexOf(tagName) === -1) {
                pos++;
                children = parseChildren(tagName);
            } else {
                pos++;
            }
        } else {
            pos++;
        }
        return {
            tagName: tagName,
            attributes: attributes,
            children: children
        };
    }
    function parseString() {
        var startChar = S[pos];
        var startpos = pos + 1;
        pos = S.indexOf(startChar, startpos);
        return S.slice(startpos, pos);
    }
    function findElements() {
        var r = new RegExp("\\s" + options.attrName + "\\s*=['\"]" + options.attrValue + "['\"]").exec(S);
        if (r) {
            return r.index;
        } else {
            return -1;
        }
    }
    var out = null;
    if (options.attrValue !== undefined) {
        options.attrName = options.attrName || "id";
        var out = [];
        while ((pos = findElements()) !== -1) {
            pos = S.lastIndexOf("<", pos);
            if (pos !== -1) {
                out.push(parseNode());
            }
            S = S.substr(pos);
            pos = 0;
        }
    } else if (options.parseNode) {
        out = parseNode();
    } else {
        out = parseChildren("");
    }
    if (options.filter) {
        out = filter(out, options.filter);
    }
    if (options.simplify) {
        return simplify(Array.isArray(out) ? out : [ out ]);
    }
    if (options.setPos) {
        out.pos = pos;
    }
    return out;
}

/**
 * transform the DomObject to an object that is like the object of PHP`s simple_xmp_load_*() methods.
 * this format helps you to write that is more likely to keep your program working, even if there a small changes in the XML schema.
 * be aware, that it is not possible to reproduce the original xml from a simplified version, because the order of elements is not saved.
 * therefore your program will be more flexible and easier to read.
 *
 * @param {tNode[]} children the childrenList
 */ function simplify(children) {
    var out = {};
    if (!children.length) {
        return "";
    }
    if (children.length === 1 && typeof children[0] == "string") {
        return children[0];
    }
    children.forEach(function(child) {
        if (typeof child !== "object") {
            return;
        }
        if (!out[child.tagName]) out[child.tagName] = [];
        var kids = simplify(child.children);
        out[child.tagName].push(kids);
        if (Object.keys(child.attributes).length && typeof kids !== "string") {
            kids._attributes = child.attributes;
        }
    });
    for (var i in out) {
        if (out[i].length == 1) {
            out[i] = out[i][0];
        }
    }
    return out;
}

/**
 * behaves the same way as Array.filter, if the filter method return true, the element is in the resultList
 * @params children{Array} the children of a node
 * @param f{function} the filter method
 */ function filter(children, f, dept = 0, path = "") {
    var out = [];
    children.forEach(function(child, i) {
        if (typeof child === "object" && f(child, i, dept, path)) out.push(child);
        if (child.children) {
            var kids = filter(child.children, f, dept + 1, (path ? path + "." : "") + i + "." + child.tagName);
            out = out.concat(kids);
        }
    });
    return out;
}

function toContentString(tDom) {
    if (Array.isArray(tDom)) {
        var out = "";
        tDom.forEach(function(e) {
            out += " " + toContentString(e);
            out = out.trim();
        });
        return out;
    } else if (typeof tDom === "object") {
        return toContentString(tDom.children);
    } else {
        return " " + tDom;
    }
}

const XMP_HEADER_STRING = "http://ns.adobe.com/xap/1.0/\0";

const XMP_SEGMENT_HEADER_SIZE_BYTES = XMP_HEADER_STRING.length;

function fetchContent(node) {
    let result = "";
    if (node.children.length === 0) {
        if ("rdf:value" in node.attributes) {
            result = node.attributes["rdf:value"];
        } else if ("rdf:resource" in node.attributes) {
            result = node.attributes["rdf:resource"];
        }
    } else {
        result = toContentString(node);
    }
    return result;
}

function fetchAttributes(props, node) {
    for (const key in node.attributes) {
        if (/^(?:xmlns|rdf):/.test(key)) continue;
        props[key] = node.attributes[key];
    }
}

function getXmpMetadata(source) {
    if (source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
        const content = detectEncoding(source);
        if (!content) {
            return null;
        }
        source = content.result;
    }
    if (typeof source !== "string") {
        return null;
    }
    const result = {};
    parse(source, {
        filter: (node, index, depth, path) => {
            const path3 = path.replace(/\.(\d+)\./g, ".").split(".");
            if (node.tagName.startsWith("rdf:")) {
                if (node.tagName === "rdf:li" && path3.length >= 2 && /^rdf:(?:Alt|Seq|Bag)$/.test(path3.at(-1)) && path3.at(-2) in result) {
                    const parentKey = path3.at(-2);
                    if (Array.isArray(result[parentKey])) {
                        result[parentKey].push(fetchContent(node));
                    } else {
                        result[parentKey] = [ fetchContent(node) ];
                    }
                } else if (node.tagName === "rdf:Description" && path3.at(-1) === "rdf:RDF") {
                    fetchAttributes(result, node);
                }
            } else if (node.tagName.startsWith("x:")) {
                fetchAttributes(result, node);
            } else if (node.tagName.startsWith("?") || node.tagName.endsWith(":NativeDigest")) ; else {
                const parentKey = path3.at(-1);
                if (!/^rdf:/.test(node.tagName) && !/^rdf:/.test(parentKey) && parentKey in result) {
                    if (typeof result[parentKey] === "object") {
                        result[parentKey][node.tagName] = fetchContent(node);
                    } else {
                        result[parentKey] = {
                            [node.tagName]: fetchContent(node)
                        };
                    }
                } else {
                    result[node.tagName] = fetchContent(node);
                }
            }
            return true;
        }
    });
    return result;
}

const PNG_HEADER_SIZE_BYTES = 8;

const MAX_EMBEDDED_EXIF_SIZE_BYTES = 1024 * 1024;

function toKeyword(cp) {
    if (typeof cp === "number") {
        return 32 <= cp && cp <= 126 || 161 <= cp && cp <= 255 ? String.fromCharCode(cp) : `<${cp.toString(16).padStart(2, "0")}>`;
    } else {
        let result = "";
        for (const cp2 of cp) {
            result += 32 <= cp2 && cp2 <= 126 || 161 <= cp2 && cp2 <= 255 ? String.fromCharCode(cp2) : `<${cp2.toString(16).padStart(2, "0")}>`;
        }
        return result;
    }
}

function toLatin1(cp) {
    if (typeof cp === "number") {
        return 32 <= cp && cp <= 126 || 160 <= cp && cp <= 255 || cp === 10 ? String.fromCharCode(cp) : `<${cp.toString(16).padStart(2, "0")}>`;
    } else {
        let result = "";
        for (const cp2 of cp) {
            result += 32 <= cp2 && cp2 <= 126 || 160 <= cp2 && cp2 <= 255 || cp2 === 10 ? String.fromCharCode(cp2) : `<${cp2.toString(16).padStart(2, "0")}>`;
        }
        return result;
    }
}

class PngParser extends Parser {
    /**
	 * If the text has a known structure, expand it
	 *
	 * @param {string} key
	 * @param {string} value
	 * @returns {object}
	 */
    parseComment(key, value) {
        if (key === "XML:com.adobe.xmp" && /^\s*<(?:\?xpacket.+?\?|x:xmpmeta.+?)>/.test(value)) {
            try {
                const result = getXmpMetadata(value);
                return {
                    type: "XMP",
                    key: key,
                    value: result
                };
            } catch (err) {
                console.error(err);
            }
        } else if (key === "Raw profile type exif") {
            try {
                const header = /^[^\n]*\nexif\n[^\d]*(\d+)[^\n]*\n/.exec(value);
                if (!header) {
                    throw new Error("invalid header");
                }
                const recordedSize = parseInt(header[1], 10);
                if (recordedSize > MAX_EMBEDDED_EXIF_SIZE_BYTES) {
                    throw new Error("too large size");
                }
                const hexPattern = /[0-9A-Fa-f]{2}/g;
                let bytes = new Uint8Array(recordedSize);
                let writtenSize = 0;
                hexPattern.lastIndex = header[0].length;
                for (let re; re = hexPattern.exec(value); ) {
                    bytes[writtenSize++] = parseInt(re[0], 16);
                }
                if (writtenSize !== recordedSize) {
                    throw new Error(`invalid data size. header: ${recordedSize}, actual: ${writtenSize}`);
                }
                const result = getExifTags(bytes.buffer);
                if (!result) {
                    throw new Error(`failed to parse the exif data`);
                }
                return {
                    type: "EXIF",
                    key: key,
                    value: result
                };
            } catch (err) {
                console.error(err);
            }
        }
        return super.parseComment(key, value);
    }
    /**
	 * Calculate crc32 in accordance with the PNG spec
	 *
	 * @param {string|Uint8Array} data
	 */    static crc32forPng(data) {
        let value = 4294967295;
        for (let s of data) {
            value ^= typeof s === "string" ? s.charCodeAt(0) : s;
            for (let j = 0; j < 8; j++) {
                const lsb = value & 1;
                value >>>= 1;
                if (lsb) {
                    value ^= 3988292384;
                }
            }
        }
        value ^= 4294967295;
        return value >>> 0;
    }
    /**
	 * Create a dictionary for argument of chunk event
	 *
	 * @param {string} key
	 * @param {string} value
	 * @param {object} args
	 * @returns {object}
	 */    #createArgsForChunkEvent(key, value, args = {}) {
        args.key = key;
        args.value = value;
        const content = this.parseComment(key, value);
        args.type = content.type;
        if (content.type === "XMP") {
            args.xmp = content.value;
        } else if (content.type === "EXIF") {
            args.exif = content.value;
        } else if (content.type === "JSON") {
            args.json = content.value;
        }
        return args;
    }
    /**
	 * get key and value from tEXt chunk
	 *
	 * @param {Uint8Array} buffer
	 * @param {number} chunkTop
	 * @param {number} length
	 * @returns {object} key, value
	 */    #getKeyValFromText(buffer, chunkTop, length) {
        const start = chunkTop + 4 + 4;
        const end = chunkTop + 4 + 4 + length;
        let state = 0;
        let key = "";
        let value = "";
        for (let i = start; i < end; i++) {
            switch (state) {
              case 0:
                if (buffer[i] === 0) {
                    state = 1;
                } else {
                    key += toKeyword(buffer[i]);
                }
                break;

              case 1:
                value += toLatin1(buffer[i]);
                break;

              default:
                throw new Error("!?");
            }
        }
        return {
            key: key,
            value: value
        };
    }
    /**
	 * get key and value from zTXt chunk
	 *
	 * @param {Uint8Array} buffer
	 * @param {number} chunkTop
	 * @param {number} length
	 * @returns {Promise<object>} key, value
	 */    async #getKeyValFromCompressedText(buffer, chunkTop, length) {
        const start = chunkTop + 4 + 4;
        const end = chunkTop + 4 + 4 + length;
        let state = 0;
        let compressMethod = 0;
        let key = "";
        let value = [];
        for (let i = start; i < end; i++) {
            switch (state) {
              case 0:
                if (buffer[i] === 0) {
                    state = 1;
                } else {
                    key += toKeyword(buffer[i]);
                }
                break;

              case 1:
                compressMethod = buffer[i];
                state = 2;
                break;

              case 2:
                value.push(buffer[i]);
                break;

              default:
                throw new Error("!?");
            }
        }
        if (compressMethod === 0) {
            value = await decompressDeflate(value);
            value = toLatin1(new Uint8Array(value));
        } else {
            value = `(Unknown compress method: ${compressMethod})`;
        }
        return {
            key: key,
            value: value
        };
    }
    /**
	 * get key, value, and other variables from iTXt chunk
	 *
	 * @param {Uint8Array} buffer
	 * @param {number} chunkTop
	 * @param {number} length
	 * @returns {Promise<object>} language, key, keyTranslated, value
	 */    async #getKeyValFromI18nText(buffer, chunkTop, length) {
        const start = chunkTop + 4 + 4;
        const end = chunkTop + 4 + 4 + length;
        let state = 0;
        let language = "";
        let compressed = false;
        let compressMethod = 0;
        let key = "";
        let keyTranslated = [];
        let value = [];
        for (let i = start; i < end; i++) {
            switch (state) {
              case 0:
                if (buffer[i] === 0) {
                    state = 1;
                } else {
                    key += toKeyword(buffer[i]);
                }
                break;

              case 1:
                compressed = !!buffer[i];
                state = 2;
                break;

              case 2:
                compressMethod = buffer[i];
                state = 3;
                break;

              case 3:
                if (buffer[i] === 0) {
                    state = 4;
                } else {
                    language += toLatin1(buffer[i]);
                }
                break;

              case 4:
                if (buffer[i] === 0) {
                    state = 5;
                } else {
                    keyTranslated.push(buffer[i]);
                }
                break;

              case 5:
                value.push(buffer[i]);
                break;

              default:
                throw new Error("!?");
            }
        }
        const decoder = new TextDecoder;
        keyTranslated = decoder.decode(new Uint8Array(keyTranslated));
        if (compressed) {
            if (compressMethod === 0) {
                value = await decompressDeflate(value);
                value = decoder.decode(new Uint8Array(value));
            } else {
                value = `(Unknown compress method: ${compressMethod})`;
            }
        } else {
            value = decoder.decode(new Uint8Array(value));
        }
        return {
            language: language,
            key: key,
            keyTranslated: keyTranslated,
            value: value
        };
    }
    /**
	 * Determine whether it is a PNG by testing the beginning of the buffer
	 *
	 * @param {Uint8Array} buffer
	 * @returns {boolean}
	 */    test(buffer) {
        if (buffer.byteLength < PNG_HEADER_SIZE_BYTES) {
            return false;
        }
        if (buffer[0] !== 137 || buffer[1] !== 80 || buffer[2] !== 78 || buffer[3] !== 71 || buffer[4] !== 13 || buffer[5] !== 10 || buffer[6] !== 26 || buffer[7] !== 10) {
            return false;
        }
        return true;
    }
    /**
	 * Parse a PNG file
	 *
	 * @param {Uint8Array} buffer
	 * @param {object} options, see parser.js
	 * @returns {Promise<Array>|Promise<Blob>}
	 */    async parse(buffer, options = {}) {
        const chunks = [];
        const view = new DataView(buffer.buffer);
        const size = view.byteLength;
        const log = this.getLogFunction(options);
        const onchunk = this.getChunkHandlerFunction(options);
        log(`*** starting png parsing ***`);
        if (!this.test(buffer)) {
            return null;
        }
        chunks.push(buffer.slice(0, PNG_HEADER_SIZE_BYTES));
        let pos = PNG_HEADER_SIZE_BYTES;
        let foundIEND = false;
        for (let index = 0; pos < size; index++) {
            const topPos = pos;
            let chunkName, chunkDataSize;
            let skip = false;
            let onchunkInvoked = false;
            if (pos + 4 > size) return null;
            chunkDataSize = view.getUint32(pos);
            pos += 4;
            if (pos + 4 > size) return null;
            chunkName = String.fromCharCode(buffer[pos]) + String.fromCharCode(buffer[pos + 1]) + String.fromCharCode(buffer[pos + 2]) + String.fromCharCode(buffer[pos + 3]);
            pos += 4;
            if (pos + chunkDataSize + 4 > size) return null;
            log(`${topPos.toString(16).padStart(8, "0")}: #${index.toString(10).padEnd(4)} ${chunkName}, $${chunkDataSize.toString(16)} (${chunkDataSize}) bytes`);
            if (!/^[\u0020-\u007e]+$/.test(chunkName)) {
                throw new Error(`found invalid chunk name: "${chunkName}"`);
            }
            if (chunkName === "IEND") {
                pos = topPos;
                foundIEND = true;
                onchunk(chunkName);
                onchunkInvoked = true;
                break;
            } else if (chunkName === "tEXt" || chunkName === "zTXt" || chunkName === "iTXt") {
                let args;
                if (chunkName === "tEXt") {
                    const {key: key, value: value} = this.#getKeyValFromText(buffer, topPos, chunkDataSize);
                    args = this.#createArgsForChunkEvent(key, value);
                } else if (chunkName === "zTXt") {
                    const {key: key, value: value} = await this.#getKeyValFromCompressedText(buffer, topPos, chunkDataSize);
                    args = this.#createArgsForChunkEvent(key, value);
                } else if (chunkName === "iTXt") {
                    const {language: language, key: key, keyTranslated: keyTranslated, value: value} = await this.#getKeyValFromI18nText(buffer, topPos, chunkDataSize);
                    args = this.#createArgsForChunkEvent(key, value, {
                        language: language,
                        keyTranslated: keyTranslated
                    });
                }
                onchunk(chunkName, args);
                onchunkInvoked = true;
                if (options.stripComment || options.randomize) {
                    log(`\tskipping ${chunkName} chunk`);
                    skip = true;
                } else if (args.exif && options.stripExif) {
                    log(`\tskipping EXIF in ${chunkName} chunk`);
                    skip = true;
                } else if (args.xmp && options.stripXmp) {
                    log(`\tskipping XMP in ${chunkName} chunk`);
                    skip = true;
                }
            } else if (chunkName === "eXIf") {
                const start = topPos + 4 + 4;
                const end = topPos + 4 + 4 + chunkDataSize;
                onchunk(chunkName, {
                    exif: getExifTags(buffer.slice(start, end).buffer)
                });
                onchunkInvoked = true;
                if (options.stripExif) {
                    log(`\tskipping EXIF chunk`);
                    skip = true;
                }
            } else if (chunkName === "IHDR") {
                if (index) {
                    return null;
                }
            }
            pos += chunkDataSize + 4;
            if (!onchunkInvoked) {
                onchunk(chunkName);
            }
            if (!skip) {
                chunks.push(buffer.slice(topPos, pos));
            }
        }
        if (!foundIEND) {
            return null;
        }
        if (options.randomize) {
            const uuid = await createUUIDv4();
            const content = (new TextEncoder).encode(`Comment\0${uuid}`);
            const newChunk = new Uint8Array(4 + 4 + content.byteLength + 4);
            const newChunkView = new DataView(newChunk.buffer);
            newChunkView.setUint32(0, content.byteLength);
            newChunk.set((new TextEncoder).encode("tEXt"), 4);
            newChunk.set(content, 8);
            newChunkView.setUint32(4 + 4 + content.byteLength, PngParser.crc32forPng(content));
            chunks.push(newChunk);
        }
        chunks.push(buffer.slice(pos, size));
        return options.returnChunks ? chunks : new Blob(chunks, {
            type: "image/png"
        });
    }
}

const MARKER_TEM = 65281;

const MARKER_RST0 = 65488;

const MARKER_RST7 = 65495;

const MARKER_SOI = 65496;

const MARKER_EOI = 65497;

const MARKER_SOS = 65498;

const MARKER_APP1 = 65505;

const MARKER_COM = 65534;

/**
 * Returns whether the segment contains EXIF data
 *
 * @param {Uint8Array} buffer
 * @param {number} marker
 * @param {number} length
 * @param {number} pos
 */ function isExifSegment(buffer, marker, length, pos) {
    if (marker !== MARKER_APP1) return false;
    const start = pos + 2 + 2;
    const end = pos + 2 + 2 + length;
    if (start + EXIF_SEGMENT_HEADER_SIZE_BYTES > end) {
        return false;
    }
    for (let i = 0; i < EXIF_SEGMENT_HEADER_SIZE_BYTES; i++) {
        if (buffer[start + i] !== EXIF_HEADER_STRING.charCodeAt(i)) {
            return false;
        }
    }
    return true;
}

/**
 * Returns whether the segment contains XMP data
 *
 * @param {Uint8Array} buffer
 * @param {number} marker
 * @param {number} length
 * @param {number} pos
 */ function isXmpSegment(buffer, marker, length, pos) {
    if (marker !== MARKER_APP1) return false;
    const start = pos + 2 + 2;
    const end = pos + 2 + 2 + length;
    if (start + XMP_SEGMENT_HEADER_SIZE_BYTES > end) {
        return false;
    }
    for (let i = 0; i < XMP_SEGMENT_HEADER_SIZE_BYTES; i++) {
        if (buffer[start + i] !== XMP_HEADER_STRING.charCodeAt(i)) {
            return false;
        }
    }
    return true;
}

class JpegParser extends Parser {
    /**
	 * Determine whether it is a JPEG by testing the beginning of the buffer
	 *
	 * @param {Uint8Array} buffer
	 * @returns {boolean}
	 */
    test(buffer) {
        if (buffer.byteLength < 4) {
            return false;
        }
        if ((buffer[0] << 8 | buffer[1]) !== MARKER_SOI) {
            return false;
        }
        return true;
    }
    /**
	 * Parse a JPEG file
	 *
	 * @param {Uint8Array} buffer
	 * @param {object} options, see parser.js
	 * @returns {Promise<Array>|Promise<Blob>}
	 */    async parse(buffer, options = {}) {
        const chunks = [];
        const view = new DataView(buffer.buffer);
        const size = view.byteLength;
        const log = this.getLogFunction(options);
        const onchunk = this.getChunkHandlerFunction(options);
        log(`*** starting jpeg parsing ***`);
        if (!this.test(buffer)) {
            return null;
        }
        let pos = 0;
        let foundSOS = false;
        for (let index = 0; pos < size; index++) {
            const topPos = pos;
            let marker, chunkDataSize;
            let skip = false;
            let onchunkInvoked = false;
            if (pos + 2 > size) return null;
            marker = view.getUint16(pos);
            pos += 2;
            if ((marker & 65280) !== 65280) {
                throw new Error(`invalid marker: 0x${marker.toString(16)}`);
            }
            if (MARKER_RST0 <= marker && marker <= MARKER_RST7 || marker === MARKER_SOI || marker === MARKER_EOI || marker === MARKER_TEM) {
                chunkDataSize = 0;
            } else {
                if (pos + 2 > size) return null;
                chunkDataSize = view.getUint16(pos);
            }
            pos += chunkDataSize;
            log(`${topPos.toString(16).padStart(8, "0")}: #${index.toString(10).padEnd(4)} ${marker.toString(16)}, $${(chunkDataSize + 2).toString(16)} (${chunkDataSize + 2}) bytes`);
            if (marker === MARKER_EOI) {
                break;
            } else if (marker === MARKER_COM) {
                const start = topPos + 2 + 2;
                const end = topPos + 2 + chunkDataSize;
                const decodedComment = detectEncoding(buffer.slice(start, end));
                const comment = (decodedComment?.result ?? "").replace(/\x00.*/, "");
                const parsedComment = this.parseComment("", comment);
                const args = {
                    type: parsedComment.type,
                    key: "",
                    value: comment
                };
                if (parsedComment.type === "JSON") {
                    args.json = parsedComment.value;
                }
                log(`\tCOM: "${comment}"`);
                onchunk("COM", args);
                onchunkInvoked = true;
                if (options.stripComment || options.randomize) {
                    skip = true;
                }
            } else if (isExifSegment(buffer, marker, chunkDataSize, topPos)) {
                const start = topPos + 2 + 2 + EXIF_SEGMENT_HEADER_SIZE_BYTES;
                const end = topPos + 2 + chunkDataSize;
                onchunk("EXIF", {
                    exif: getExifTags(buffer.slice(start, end).buffer)
                });
                onchunkInvoked = true;
                if (options.stripExif) {
                    log(`\tskipping EXIF segment`);
                    skip = true;
                }
            } else if (isXmpSegment(buffer, marker, chunkDataSize, topPos)) {
                const start = topPos + 2 + 2 + XMP_SEGMENT_HEADER_SIZE_BYTES;
                const end = topPos + 2 + chunkDataSize;
                const decoded = detectEncoding(buffer.slice(start, end));
                onchunk("XMP", {
                    xmp: decoded ? getXmpMetadata(decoded.result) : null
                });
                onchunkInvoked = true;
                if (options.stripXmp) {
                    log(`\tskipping XMP segment`);
                    skip = true;
                }
            } else if (marker === MARKER_SOS) {
                pos = topPos;
                foundSOS = true;
                break;
            }
            if (!onchunkInvoked) {
                onchunk(marker);
            }
            if (!skip) {
                chunks.push(buffer.slice(topPos, pos));
            }
        }
        if (!foundSOS) {
            return null;
        }
        if (options.randomize) {
            const uuid = await createUUIDv4();
            const content = (new TextEncoder).encode(`${uuid}\0`);
            const newChunk = new Uint8Array(2 + 2 + content.byteLength);
            const newChunkView = new DataView(newChunk.buffer);
            newChunkView.setUint16(0, MARKER_COM);
            newChunkView.setUint16(2, content.byteLength + 2);
            newChunk.set(content, 4);
            chunks.push(newChunk);
        }
        chunks.push(buffer.slice(pos, size));
        return options.returnChunks ? chunks : new Blob(chunks, {
            type: "image/jpeg"
        });
    }
}

const RIFF_HEADER_SIZE_BYTES = 12;

class WebpParser extends Parser {
    /**
	 * @param {Uint8Array} buffer - memory block to parse
	 * @returns {boolean}
	 */
    test(buffer) {
        if (buffer.byteLenth < RIFF_HEADER_SIZE_BYTES) {
            return false;
        }
        if (buffer[0] !== 82 || buffer[1] !== 73 || buffer[2] !== 70 || buffer[3] !== 70) {
            return false;
        }
        if (buffer[8] !== 87 || buffer[9] !== 69 || buffer[10] !== 66 || buffer[11] !== 80) {
            return false;
        }
        return true;
    }
    /**
	 * Parse a WEBP file
	 *
	 * @param {Uint8Array} buffer
	 * @param {object} options, see parser.js
	 * @returns {Promise<Array>|Promise<Blob>}
	 */    async parse(buffer, options = {}) {
        const chunks = [];
        const view = new DataView(buffer.buffer);
        const bufferSize = view.byteLength;
        const log = this.getLogFunction(options);
        const onchunk = this.getChunkHandlerFunction(options);
        if (!this.test(buffer)) {
            log(`bad signature`);
            return null;
        }
        chunks.push(buffer.slice(0, RIFF_HEADER_SIZE_BYTES));
        const logicalSize = view.getUint32(4, true) + 8;
        if (logicalSize <= 8) {
            log(`found invalid logical size: ${logicalSize}`);
            return null;
        }
        if (logicalSize > bufferSize) {
            log(`logical size (${logicalSize}) is greater than buffer size (${bufferSize})`);
            return null;
        }
        log([ `+++ parsing WebP +++`, `   buffer size: ${bufferSize}`, `  logical size: ${logicalSize}, stored value: ${logicalSize - 8}` ].join("\n"));
        let pos = RIFF_HEADER_SIZE_BYTES;
        for (let index = 0; pos < logicalSize; index++) {
            const topPos = pos;
            let fourCC, chunkDataSize;
            let skip = false;
            let onchunkInvoked = false;
            if (pos + 4 > logicalSize) {
                log(`failed to retrieve fourCC at ${pos}, logicalSize: ${logicalSize}`);
                return null;
            }
            fourCC = String.fromCharCode(buffer[pos]) + String.fromCharCode(buffer[pos + 1]) + String.fromCharCode(buffer[pos + 2]) + String.fromCharCode(buffer[pos + 3]);
            pos += 4;
            if (pos + 4 > logicalSize) {
                log(`failed to retrieve chunk data size at ${pos}, logicalSize: ${logicalSize}`);
                return null;
            }
            chunkDataSize = view.getUint32(pos, true);
            pos += 4;
            if (pos + chunkDataSize + (chunkDataSize & 1) > logicalSize) {
                log(`chunk size exceeds buffer size`);
                return null;
            }
            const chunkEnd = pos + chunkDataSize;
            log([ `${topPos.toString(16).padStart(8, "0")}:`, `#${index.toString(10).padEnd(4)}`, `chunk "${fourCC}"`, `${topPos}...${chunkEnd - 1}`, `(${chunkEnd - topPos} bytes)` ].join(" "));
            if (fourCC === "EXIF") {
                const start = topPos + 4 + 4;
                const end = topPos + 4 + 4 + chunkDataSize;
                onchunk("EXIF", {
                    exif: getExifTags(buffer.slice(start, end).buffer)
                });
                onchunkInvoked = true;
                if (options.stripExif) {
                    log(`\tskipping EXIF chunk`);
                    skip = true;
                }
            } else if (fourCC === "XMP ") {
                const start = topPos + 4 + 4;
                const end = topPos + 4 + 4 + chunkDataSize;
                const decoded = detectEncoding(buffer.slice(start, end));
                onchunk("XMP", {
                    xmp: decoded ? getXmpMetadata(decoded.result) : null
                });
                onchunkInvoked = true;
                if (options.stripXmp || options.randomize) {
                    log(`\tskipping XMP segment`);
                    skip = true;
                }
            }
            pos += chunkDataSize + (chunkDataSize & 1);
            if (!onchunkInvoked) {
                onchunk(fourCC);
            }
            if (!skip) {
                chunks.push(buffer.slice(topPos, pos));
            }
        }
        if (options.randomize) {
            const uuid = await createUUIDv4();
            const content = (new TextEncoder).encode(`<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>\n<x:xmpmeta xmlns:x="adobe:ns:meta/">\n  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n    <rdf:Description xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">\n      <xmpMM:DocumentID>mmmf.docid:${uuid}</xmpMM:DocumentID>\n    </rdf:Description>\n  </rdf:RDF>\n</x:xmpmeta>\n<?xpacket end="w"?>`);
            const newChunk = new Uint8Array(4 + 4 + content.byteLength + (content.byteLength & 1));
            const newChunkView = new DataView(newChunk.buffer);
            newChunk.set((new TextEncoder).encode("XMP "), 0);
            newChunkView.setUint32(4, content.byteLength, true);
            newChunk.set(content, 8);
            chunks.push(newChunk);
        }
        chunks.push(buffer.slice(pos, logicalSize));
        const newLogicalSize = chunks.reduce((total, current) => total + (current.byteLength || current.length), 0);
        new DataView(chunks[0].buffer).setUint32(4, newLogicalSize - 8, true);
        return options.returnChunks ? chunks : new Blob(chunks, {
            type: "image/webp"
        });
    }
}

const parsers = [ new PngParser, new JpegParser, new WebpParser ];

/**
 * Returns an empty metadata
 *
 * @returns {object} empty metadata
 */ function getInitialMetadata() {
    return {
        texts: [],
        positivePrompts: [],
        negativePrompts: [],
        structuredData: [],
        gpsInfo: [],
        exifTags: [],
        xmp: []
    };
}

/**
 * Returns a parser capable of processing the argument data
 *
 * @param {Blob} blob - parse target
 * @returns {Promise<object>|Promise<null>} blob, buffer(Uint8Array), parser instance
 */ async function getParser(blob) {
    const buffer = new Uint8Array(await blob.arrayBuffer());
    const filtered = parsers.filter(parser => parser.test(buffer));
    return filtered.length ? {
        blob: blob,
        buffer: buffer,
        parser: filtered[0]
    } : null;
}

/**
 * Extract elements from objects whose key names contain “prompt”
 *
 * @param {object} result
 * @param {object} jsonObject
 * @param {string} origin
 */ function setPrompt(result, jsonObject, origin) {
    JSON.stringify(jsonObject, (key, value) => {
        if (/prompt/i.test(key)) {
            if (/negative/i.test(key)) {
                result.negativePrompts.push({
                    origin: origin,
                    name: key,
                    value: value
                });
            } else {
                result.positivePrompts.push({
                    origin: origin,
                    name: key,
                    value: value
                });
            }
        } else if (typeof value === "string" && /[^,]+(,\s*[^,]+){3,}/.test(value)) {
            result.positivePrompts.push({
                origin: origin,
                name: key,
                value: value
            });
        }
        return value;
    });
}

/**
 * Extract specific texts from EXIF tags
 *
 * @param {object} result
 * @param {object} tags
 * @param {string} origin
 */ function setTextualTagsFromExif(result, tags, origin) {
    const textualTags = [ "Image.ImageDescription", "Image.Make", "Image.Model", "Image.Software", "Image.Copyright", "Image.Artist", "Image.XPTitle", "Image.XPComment", "Image.XPAuthor", "Image.XPKeywords", "Image.XPSubject", "Image.Exif.DateTimeDigitized", "Image.Exif.UserComment", "Image.Exif.LensMake", "Image.Exif.LensModel", "Image.Exif.LensSpecification" ];
    if (!tags || !result) {
        return;
    }
    for (const textualTag of textualTags) {
        if (textualTag in tags) {
            let category = "texts";
            let value = tags[textualTag];
            let re;
            if (typeof value === "string") {
                if (value.startsWith("{") && value.endsWith("}") || value.startsWith("[") && value.endsWith("]")) {
                    try {
                        value = JSON.parse(value);
                        category = "structuredData";
                        setPrompt(result, value, `${origin} (${textualTag})`);
                    } catch {
                        value = tags[textualTag];
                    }
                } else if ((re = /^\s*[^":\s]+\s*:\s*[{\[]/.exec(value)) && (value.endsWith("}") || value.endsWith("]"))) {
                    try {
                        value = JSON.parse(value.substring(re[0].length - 1));
                        category = "structuredData";
                        setPrompt(result, value, `${origin} (${textualTag})`);
                    } catch {
                        value = tags[textualTag];
                    }
                } else if ((re = /^\s*"[^"]+"\s*:\s*[{\[]/.exec(value)) && (value.endsWith("}") || value.endsWith("]"))) {
                    try {
                        value = JSON.parse(`{${value}}`);
                        category = "structuredData";
                        setPrompt(result, value, `${origin} (${textualTag})`);
                    } catch {
                        value = tags[textualTag];
                    }
                } else {
                    setPrompt(result, value, `${origin} (${textualTag})`);
                }
            }
            result[category].push({
                origin: origin,
                name: textualTag.split(".").at(-1),
                value: value
            });
        }
    }
    if ("Image.GPS.GPSLatitudeRef" in tags && "Image.GPS.GPSLatitude" in tags && "Image.GPS.GPSLongitudeRef" in tags && "Image.GPS.GPSLongitude" in tags) {
        const lat = tags["Image.GPS.GPSLatitude"];
        const long = tags["Image.GPS.GPSLongitude"];
        const latRef = tags["Image.GPS.GPSLatitudeRef"].charAt(0);
        const longRef = tags["Image.GPS.GPSLongitudeRef"].charAt(0);
        const value = [ `${lat[0]} ${latRef}, ${long[0]} ${longRef}`, `${(lat[2] * (latRef === "W" ? -1 : 1)).toFixed(6)}, ${(long[2] * (longRef === "S" ? -1 : 1)).toFixed(6)}`, `${lat[1]} ${latRef}, ${long[1]} ${longRef}` ];
        result.gpsInfo.push({
            origin: origin,
            name: "Location",
            value: value
        });
    }
}

/**
 * Extract specific texts from XMP tags
 *
 * @param {object} result
 * @param {object} tags
 * @param {string} origin
 */ function setTextualTagsFromXmp(result, tags, origin) {
    const textualTags = [ "dc:description", "dc:rights", "dc:creator", "dc:title", "tiff:Make", "tiff:Model", "tiff:Artist", "exif:UserComment", "xmp:CreatorTool", "xmp:CreateDate" ];
    if (!tags || !result) {
        return;
    }
    for (const textualTag of textualTags) {
        if (textualTag in tags) {
            let category = "texts";
            let value = tags[textualTag];
            if (typeof value === "string") {
                if (value.startsWith("{") && value.endsWith("}") || value.startsWith("[") && value.endsWith("]")) {
                    try {
                        value = JSON.parse(value);
                        category = "structuredData";
                        setPrompt(result, value, `${origin} (${textualTag})`);
                    } catch {
                        value = tags[textualTag];
                    }
                }
            }
            result[category].push({
                origin: origin,
                name: textualTag.split(".").at(-1),
                value: value
            });
        }
    }
    if ("exif:GPSLatitude" in tags && "exif:GPSLongitude" in tags) {
        const lat = tags["exif:GPSLatitude"];
        const lng = tags["exif:GPSLongitude"];
        result.gpsInfo.push({
            origin: origin,
            name: "Location",
            value: `${lng}, ${lat}`
        });
    }
}

/**
 * Parses png data
 *
 * @param {Uint8Array} buffer
 * @param {Parser} parser
 * @returns {object}
 */ async function parsePng(buffer, parser) {
    const result = getInitialMetadata();
    await parser.parse(buffer, {
        onchunk: (chunkName, args) => {
            switch (chunkName) {
              case "tEXt":
              case "zTXt":
              case "iTXt":
                {
                    switch (args.type) {
                      case "XMP":
                        result.xmp.push({
                            origin: `embedded XMP data in ${chunkName} chunk`,
                            name: args.key,
                            value: args.xmp
                        });
                        setTextualTagsFromXmp(result, args.xmp, `embedded XMP data in ${chunkName} chunk`);
                        break;

                      case "JSON":
                        result.structuredData.push({
                            origin: `embedded JSON data in ${chunkName} chunk`,
                            name: args.key,
                            value: args.json
                        });
                        setPrompt(result, args.json, `embedded JSON data in ${chunkName} chunk`);
                        break;

                      case "EXIF":
                        result.exifTags.push({
                            origin: `embedded EXIF data in ${chunkName} chunk`,
                            name: args.key,
                            value: args.exif
                        });
                        setTextualTagsFromExif(result, args.exif, `embedded EXIF data in ${chunkName} chunk`);
                        break;

                      default:
                        result.texts.push({
                            origin: `${chunkName} chunk`,
                            name: args.key,
                            value: args.value
                        });
                        setPrompt(result, {
                            [args.key]: args.value
                        }, `${chunkName} chunk`);
                        break;
                    }
                }
                break;

              case "eXIf":
                {
                    result.exifTags.push({
                        origin: `${chunkName} chunk`,
                        value: args.exif
                    });
                    setTextualTagsFromExif(result, args.exif, "eXIf chunk");
                }
                break;
            }
        }
    });
    return result;
}

/**
 * Parses jpeg data
 *
 * @param {Uint8Array} buffer
 * @param {Parser} parser
 * @returns {object}
 */ async function parseJpeg(buffer, parser) {
    const result = getInitialMetadata();
    await parser.parse(buffer, {
        onchunk: (chunkName, args) => {
            switch (chunkName) {
              case "COM":
                {
                    switch (args.type) {
                      case "JSON":
                        result.structuredData.push({
                            origin: `embedded JSON data in ${chunkName} segment`,
                            value: args.json
                        });
                        setPrompt(result, args.json, `embedded JSON data in ${chunkName} chunk`);
                        break;

                      default:
                        result.texts.push({
                            origin: "COM segment",
                            value: args.value
                        });
                        setPrompt(result, {
                            comment: args.value
                        }, `COM segment`);
                        break;
                    }
                }
                break;

              case "EXIF":
                {
                    result.exifTags.push({
                        origin: `${chunkName} segment`,
                        value: args.exif
                    });
                    setTextualTagsFromExif(result, args.exif, "EXIF segment");
                }
                break;

              case "XMP":
                {
                    result.xmp.push({
                        origin: `${chunkName} segment`,
                        value: args.xmp
                    });
                    setTextualTagsFromXmp(result, args.xmp, "XMP segment");
                }
                break;
            }
        }
    });
    return result;
}

/**
 * Parses webp data
 *
 * @param {Uint8Array} buffer
 * @param {Parser} parser
 * @returns {object}
 */ async function parseWebp(buffer, parser) {
    const result = getInitialMetadata();
    await parser.parse(buffer, {
        onchunk: (chunkName, args) => {
            switch (chunkName) {
              case "EXIF":
                {
                    result.exifTags.push({
                        origin: `${chunkName} chunk`,
                        value: args.exif
                    });
                    setTextualTagsFromExif(result, args.exif, "EXIF segment");
                }
                break;

              case "XMP":
                {
                    result.xmp.push({
                        origin: `${chunkName} chunk`,
                        value: args.xmp
                    });
                    setTextualTagsFromXmp(result, args.xmp, "XMP segment");
                }
                break;
            }
        }
    });
    return result;
}

/**
 * Edit the media
 *
 * @param {Blob} blob
 * @param {object} options
 * @returns {Promise<object>|Promise<null>}
 */ async function tweakMetadataOf(blob, options = {}) {
    const {buffer: buffer, parser: parser} = await getParser(blob);
    if (!parser) {
        return null;
    }
    return await parser.parse(buffer, options);
}

/**
 * Get all meta data from the media
 *
 * @param {Blob} blob
 * @returns {Promise<object>}
 */ async function getMetadataFrom(blob) {
    const {buffer: buffer, parser: parser} = await getParser(blob);
    if (!parser) {
        return getInitialMetadata();
    } else if (parser instanceof PngParser) {
        return await parsePng(buffer, parser);
    } else if (parser instanceof JpegParser) {
        return await parseJpeg(buffer, parser);
    } else if (parser instanceof WebpParser) {
        return await parseWebp(buffer, parser);
    }
    throw new Error("Unknown parser??");
}

export { getMetadataFrom, tweakMetadataOf };
//# sourceMappingURL=mmmf.mjs.map
