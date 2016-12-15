import { CompileSummaryKind } from '../compile_metadata';
import { GeneratedFile } from './generated_file';
import { StaticSymbol } from './static_symbol';
import { filterFileByPatterns } from './utils';
const /** @type {?} */ STRIP_SRC_FILE_SUFFIXES = /(\.ts|\.d\.ts|\.js|\.jsx|\.tsx)$/;
export class AotSummaryResolver {
    /**
     * @param {?} host
     * @param {?} staticReflector
     * @param {?} options
     */
    constructor(host, staticReflector, options) {
        this.host = host;
        this.staticReflector = staticReflector;
        this.options = options;
        this.summaryCache = {};
    }
    /**
     * @param {?} srcFileUrl
     * @param {?} summaries
     * @return {?}
     */
    serializeSummaries(srcFileUrl, summaries) {
        const /** @type {?} */ jsonReplacer = (key, value) => {
            if (value instanceof StaticSymbol) {
                // We convert the source filenames into output filenames,
                // as the generated summary file will be used when the current
                // compilation unit is used as a library
                return {
                    '__symbolic__': 'symbol',
                    'name': value.name,
                    'path': this.host.getOutputFileName(value.filePath),
                    'members': value.members
                };
            }
            return value;
        };
        const /** @type {?} */ allSummaries = summaries.slice();
        summaries.forEach((summary) => {
            if (summary.summaryKind === CompileSummaryKind.NgModule) {
                const /** @type {?} */ moduleMeta = (summary);
                moduleMeta.exportedDirectives.concat(moduleMeta.exportedPipes).forEach((id) => {
                    if (!filterFileByPatterns(id.reference.filePath, this.options)) {
                        allSummaries.push(this.resolveSummary(id.reference));
                    }
                });
            }
        });
        return new GeneratedFile(srcFileUrl, summaryFileName(srcFileUrl), JSON.stringify(allSummaries, jsonReplacer));
    }
    /**
     * @param {?} symbol
     * @return {?}
     */
    _cacheKey(symbol) { return `${symbol.filePath}|${symbol.name}`; }
    /**
     * @param {?} staticSymbol
     * @return {?}
     */
    resolveSummary(staticSymbol) {
        const /** @type {?} */ filePath = staticSymbol.filePath;
        const /** @type {?} */ name = staticSymbol.name;
        const /** @type {?} */ cacheKey = this._cacheKey(staticSymbol);
        if (!filterFileByPatterns(filePath, this.options)) {
            let /** @type {?} */ summary = this.summaryCache[cacheKey];
            const /** @type {?} */ summaryFilePath = summaryFileName(filePath);
            if (!summary) {
                try {
                    const /** @type {?} */ jsonReviver = (key, value) => {
                        if (value && value['__symbolic__'] === 'symbol') {
                            // Note: We can't use staticReflector.findDeclaration here:
                            // Summary files can contain symbols of transitive compilation units
                            // (via the providers), and findDeclaration needs .metadata.json / .d.ts files,
                            // but we don't want to depend on these for transitive dependencies.
                            return this.staticReflector.getStaticSymbol(value['path'], value['name'], value['members']);
                        }
                        else {
                            return value;
                        }
                    };
                    const /** @type {?} */ readSummaries = JSON.parse(this.host.loadSummary(summaryFilePath), jsonReviver);
                    readSummaries.forEach((summary) => {
                        const /** @type {?} */ filePath = summary.type.reference.filePath;
                        this.summaryCache[this._cacheKey(summary.type.reference)] = summary;
                    });
                    summary = this.summaryCache[cacheKey];
                }
                catch (e) {
                    console.error(`Error loading summary file ${summaryFilePath}`);
                    throw e;
                }
            }
            if (!summary) {
                throw new Error(`Could not find the symbol ${name} in the summary file ${summaryFilePath}!`);
            }
            return summary;
        }
        else {
            return null;
        }
    }
}
function AotSummaryResolver_tsickle_Closure_declarations() {
    /** @type {?} */
    AotSummaryResolver.prototype.summaryCache;
    /** @type {?} */
    AotSummaryResolver.prototype.host;
    /** @type {?} */
    AotSummaryResolver.prototype.staticReflector;
    /** @type {?} */
    AotSummaryResolver.prototype.options;
}
/**
 * @param {?} fileName
 * @return {?}
 */
function summaryFileName(fileName) {
    const /** @type {?} */ fileNameWithoutSuffix = fileName.replace(STRIP_SRC_FILE_SUFFIXES, '');
    return `${fileNameWithoutSuffix}.ngsummary.json`;
}
//# sourceMappingURL=summary_resolver.js.map