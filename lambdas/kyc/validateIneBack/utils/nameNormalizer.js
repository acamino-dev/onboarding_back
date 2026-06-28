"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeNameForComparison = void 0;
var normalizeNameForComparison = function (name) {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Za-z\s]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();
};
exports.normalizeNameForComparison = normalizeNameForComparison;
