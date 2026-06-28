"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeIneBack = void 0;
var client_textract_1 = require("@aws-sdk/client-textract");
var errors_1 = require("../../../../shared/constants/errors");
var textractClient = new client_textract_1.TextractClient({});
var getTextForBlock = function (block, blockMap) {
    if (!block.Relationships)
        return '';
    return block.Relationships
        .filter(function (r) { return r.Type === 'CHILD'; })
        .flatMap(function (r) { var _a; return (_a = r.Ids) !== null && _a !== void 0 ? _a : []; })
        .map(function (id) { return blockMap.get(id); })
        .filter(function (b) { return (b === null || b === void 0 ? void 0 : b.BlockType) === 'WORD'; })
        .map(function (b) { var _a; return (_a = b.Text) !== null && _a !== void 0 ? _a : ''; })
        .join(' ');
};
// Lines on the INE back that signal end of the name section
var BACK_NAME_STOP_PATTERNS = [
    /^DOMICILIO/,
    /^DIRECCI[OÓ]N/,
    /^MUNICIPIO/,
    /^DELEGACI[OÓ]N/,
    /^ENTIDAD/,
    /^SECCI[OÓ]N/,
    /^CLAVE DE ELECTOR/,
    /^FOLIO/,
    /^CURP/,
    /^VIGENCIA/,
    /^FECHA/,
];
// Lines interspersed near the name that are not name parts
var BACK_NAME_SKIP_PATTERNS = [
    /^ESTADOS UNIDOS/,
    /^INSTITUTO/,
    /^ELECTORAL/,
    /^MEXICO/,
    /^NOMBRE/,
    /^SEXO/,
    /^A[NÑ]O/,
];
var extractNameFromLines = function (blocks) {
    var lines = blocks
        .filter(function (b) { return b.BlockType === 'LINE'; })
        .map(function (b) { var _a, _b; return (_b = (_a = b.Text) === null || _a === void 0 ? void 0 : _a.toUpperCase().trim()) !== null && _b !== void 0 ? _b : ''; })
        .filter(function (t) { return t.length > 0; });
    // Try to find explicit NOMBRE/NOMBRES label first
    var nombreIdx = lines.findIndex(function (t) { return t === 'NOMBRE' || t === 'NOMBRES'; });
    var startIdx = nombreIdx !== -1 ? nombreIdx + 1 : 0;
    var nameParts = [];
    var _loop_1 = function (i) {
        var line = lines[i];
        if (BACK_NAME_STOP_PATTERNS.some(function (p) { return p.test(line); }))
            return "break";
        if (BACK_NAME_SKIP_PATTERNS.some(function (p) { return p.test(line); }))
            return "continue";
        if (/^[A-ZÁÉÍÓÚÜÑ\s]{3,}$/.test(line))
            nameParts.push(line);
        // If we found name parts and hit a non-alpha line, stop collecting
        if (nameParts.length > 0 && !/^[A-ZÁÉÍÓÚÜÑ\s]{3,}$/.test(line))
            return "break";
    };
    for (var i = startIdx; i < lines.length; i++) {
        var state_1 = _loop_1(i);
        if (state_1 === "break")
            break;
    }
    return nameParts.length > 0 ? nameParts.join(' ') : undefined;
};
var analyzeIneBack = function (bucket, key) { return __awaiter(void 0, void 0, void 0, function () {
    var response, blocks, blockMap, _i, blocks_1, block, keyText, valueBlockId, valueBlock, nombre_1, nombre, error_1;
    var _a, _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 2, , 3]);
                return [4 /*yield*/, textractClient.send(new client_textract_1.AnalyzeDocumentCommand({
                        Document: { S3Object: { Bucket: bucket, Name: key } },
                        FeatureTypes: ['FORMS'],
                    }))];
            case 1:
                response = _f.sent();
                blocks = (_a = response.Blocks) !== null && _a !== void 0 ? _a : [];
                blockMap = new Map(blocks.map(function (b) { var _a; return [(_a = b.Id) !== null && _a !== void 0 ? _a : '', b]; }));
                // Try KV pairs first
                for (_i = 0, blocks_1 = blocks; _i < blocks_1.length; _i++) {
                    block = blocks_1[_i];
                    if (block.BlockType !== 'KEY_VALUE_SET' || !((_b = block.EntityTypes) === null || _b === void 0 ? void 0 : _b.includes('KEY')))
                        continue;
                    keyText = getTextForBlock(block, blockMap).toUpperCase().trim();
                    if (!keyText.includes('NOMBRE'))
                        continue;
                    valueBlockId = (_e = (_d = (_c = block.Relationships) === null || _c === void 0 ? void 0 : _c.find(function (r) { return r.Type === 'VALUE'; })) === null || _d === void 0 ? void 0 : _d.Ids) === null || _e === void 0 ? void 0 : _e[0];
                    if (!valueBlockId)
                        continue;
                    valueBlock = blockMap.get(valueBlockId);
                    if (!valueBlock)
                        continue;
                    nombre_1 = getTextForBlock(valueBlock, blockMap).trim();
                    if (nombre_1)
                        return [2 /*return*/, nombre_1];
                }
                nombre = extractNameFromLines(blocks);
                if (!nombre) {
                    throw new errors_1.ValidationError('Name not found in INE back document');
                }
                return [2 /*return*/, nombre];
            case 2:
                error_1 = _f.sent();
                if (error_1 instanceof errors_1.ValidationError)
                    throw error_1;
                throw new Error("Error on analyzeIneBack: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)));
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.analyzeIneBack = analyzeIneBack;
