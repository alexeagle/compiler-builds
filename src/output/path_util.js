/**
 * Interface that defines how import statements should be generated.
 * @abstract
 */
export class ImportResolver {
    /**
     * Converts a file path to a module name that can be used as an `import.
     * I.e. `path/to/importedFile.ts` should be imported by `path/to/containingFile.ts`.
     * @abstract
     * @param {?} importedFilePath
     * @param {?} containingFilePath
     * @return {?}
     */
    fileNameToModuleName(importedFilePath, containingFilePath) { }
}
//# sourceMappingURL=path_util.js.map