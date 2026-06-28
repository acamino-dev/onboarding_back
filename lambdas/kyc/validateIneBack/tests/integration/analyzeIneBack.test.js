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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_textract_1 = require("@aws-sdk/client-textract");
var analyzeIneBack_1 = require("../../services/analyzeIneBack");
var BUCKET = 'acamino-file-system-dev';
var KEY = 'onboarding/2026/06/27/251e6e00-f6ba-4bb7-a427-70ab1f82320a/INE_BACK.jpg';
var pad = function (s, n) { return s.slice(0, n).padEnd(n); };
var printTable = function (headers, rows) {
    var widths = headers.map(function (h, i) {
        return Math.max.apply(Math, __spreadArray([h.length], rows.map(function (r) { var _a; return ((_a = r[i]) !== null && _a !== void 0 ? _a : '').length; }), false));
    });
    var divider = "+".concat(widths.map(function (w) { return '-'.repeat(w + 2); }).join('+'), "+");
    var fmt = function (cells) {
        return "|".concat(cells.map(function (c, i) { return " ".concat(pad(c !== null && c !== void 0 ? c : '', widths[i]), " "); }).join('|'), "|");
    };
    var lines = __spreadArray(__spreadArray([divider, fmt(headers), divider], rows.map(fmt), true), [divider], false);
    console.log(lines.join('\n'));
};
describe('analyzeIneBack integration', function () {
    it('prints Textract LINE blocks and service extraction result', function () { return __awaiter(void 0, void 0, void 0, function () {
        var client, response, blocks, blockMap, lineRows, nombre, serviceError, e_1, validationRows;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    client = new client_textract_1.TextractClient({});
                    return [4 /*yield*/, client.send(new client_textract_1.AnalyzeDocumentCommand({
                            Document: { S3Object: { Bucket: BUCKET, Name: KEY } },
                            FeatureTypes: ['FORMS'],
                        }))];
                case 1:
                    response = _b.sent();
                    blocks = (_a = response.Blocks) !== null && _a !== void 0 ? _a : [];
                    blockMap = new Map(blocks.map(function (b) { var _a; return [(_a = b.Id) !== null && _a !== void 0 ? _a : '', b]; }));
                    console.log('\nLINE BLOCKS');
                    lineRows = blocks
                        .filter(function (b) { return b.BlockType === 'LINE'; })
                        .map(function (b) {
                        var _a, _b, _c, _d;
                        var words = (_b = (_a = b.Relationships) === null || _a === void 0 ? void 0 : _a.filter(function (r) { return r.Type === 'CHILD'; }).flatMap(function (r) { var _a; return (_a = r.Ids) !== null && _a !== void 0 ? _a : []; }).map(function (id) { return blockMap.get(id); }).filter(function (w) { return (w === null || w === void 0 ? void 0 : w.BlockType) === 'WORD'; }).map(function (w) { var _a; return "".concat(w.Text, "(").concat((_a = w.Confidence) === null || _a === void 0 ? void 0 : _a.toFixed(0), "%)"); }).join('  ')) !== null && _b !== void 0 ? _b : '';
                        return [(_c = b.Text) !== null && _c !== void 0 ? _c : '', "".concat((_d = b.Confidence) === null || _d === void 0 ? void 0 : _d.toFixed(1), "%"), words];
                    });
                    printTable(['Texto línea', 'Conf%', 'Palabras (word, confianza)'], lineRows);
                    console.log('\nEXTRACCIÓN DEL SERVICIO');
                    serviceError = '';
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, analyzeIneBack_1.analyzeIneBack)(BUCKET, KEY)];
                case 3:
                    nombre = _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    e_1 = _b.sent();
                    serviceError = e_1 instanceof Error ? e_1.message : String(e_1);
                    return [3 /*break*/, 5];
                case 5:
                    validationRows = [
                        ['nombre', nombre !== null && nombre !== void 0 ? nombre : "ERROR: ".concat(serviceError)],
                    ];
                    printTable(['Campo', 'Valor extraído'], validationRows);
                    expect(nombre).toBeDefined();
                    expect((nombre !== null && nombre !== void 0 ? nombre : '').length).toBeGreaterThan(0);
                    return [2 /*return*/];
            }
        });
    }); }, 60000);
});
