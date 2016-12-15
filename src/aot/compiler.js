/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AnimationCompiler } from '../animation/animation_compiler';
import { createHostComponentMeta, identifierModuleUrl, identifierName } from '../compile_metadata';
import { ListWrapper } from '../facade/collection';
import { Identifiers, createIdentifier, createIdentifierToken } from '../identifiers';
import * as o from '../output/output_ast';
import { ComponentFactoryDependency, DirectiveWrapperDependency, ViewClassDependency } from '../view_compiler/view_compiler';
import { GeneratedFile } from './generated_file';
import { filterFileByPatterns } from './utils';
export class AotCompiler {
    /**
     * @param {?} _metadataResolver
     * @param {?} _templateParser
     * @param {?} _styleCompiler
     * @param {?} _viewCompiler
     * @param {?} _dirWrapperCompiler
     * @param {?} _ngModuleCompiler
     * @param {?} _outputEmitter
     * @param {?} _summaryResolver
     * @param {?} _localeId
     * @param {?} _translationFormat
     * @param {?} _animationParser
     * @param {?} _staticReflector
     * @param {?} _options
     */
    constructor(_metadataResolver, _templateParser, _styleCompiler, _viewCompiler, _dirWrapperCompiler, _ngModuleCompiler, _outputEmitter, _summaryResolver, _localeId, _translationFormat, _animationParser, _staticReflector, _options) {
        this._metadataResolver = _metadataResolver;
        this._templateParser = _templateParser;
        this._styleCompiler = _styleCompiler;
        this._viewCompiler = _viewCompiler;
        this._dirWrapperCompiler = _dirWrapperCompiler;
        this._ngModuleCompiler = _ngModuleCompiler;
        this._outputEmitter = _outputEmitter;
        this._summaryResolver = _summaryResolver;
        this._localeId = _localeId;
        this._translationFormat = _translationFormat;
        this._animationParser = _animationParser;
        this._staticReflector = _staticReflector;
        this._options = _options;
        this._animationCompiler = new AnimationCompiler();
    }
    /**
     * @return {?}
     */
    clearCache() { this._metadataResolver.clearCache(); }
    /**
     * @param {?} rootFiles
     * @return {?}
     */
    compileAll(rootFiles) {
        const /** @type {?} */ programSymbols = extractProgramSymbols(this._staticReflector, rootFiles, this._options);
        const { ngModuleByPipeOrDirective, files, ngModules } = analyzeAndValidateNgModules(programSymbols, this._options, this._metadataResolver);
        return Promise
            .all(ngModules.map(ngModule => this._metadataResolver.loadNgModuleDirectiveAndPipeMetadata(ngModule.type.reference, false)))
            .then(() => {
            const /** @type {?} */ sourceModules = files.map(file => this._compileSrcFile(file.srcUrl, ngModuleByPipeOrDirective, file.directives, file.pipes, file.ngModules));
            return ListWrapper.flatten(sourceModules);
        });
    }
    /**
     * @param {?} srcFileUrl
     * @param {?} ngModuleByPipeOrDirective
     * @param {?} directives
     * @param {?} pipes
     * @param {?} ngModules
     * @return {?}
     */
    _compileSrcFile(srcFileUrl, ngModuleByPipeOrDirective, directives, pipes, ngModules) {
        const /** @type {?} */ fileSuffix = _splitTypescriptSuffix(srcFileUrl)[1];
        const /** @type {?} */ statements = [];
        const /** @type {?} */ exportedVars = [];
        const /** @type {?} */ generatedFiles = [];
        // write summary files
        const /** @type {?} */ summaries = [
            ...ngModules.map(ref => this._metadataResolver.getNgModuleSummary(ref)),
            ...directives.map(ref => this._metadataResolver.getDirectiveSummary(ref)),
            ...pipes.map(ref => this._metadataResolver.getPipeSummary(ref))
        ];
        generatedFiles.push(this._summaryResolver.serializeSummaries(srcFileUrl, summaries));
        // compile all ng modules
        exportedVars.push(...ngModules.map((ngModuleType) => this._compileModule(ngModuleType, statements)));
        // compile directive wrappers
        exportedVars.push(...directives.map((directiveType) => this._compileDirectiveWrapper(directiveType, statements)));
        // compile components
        directives.forEach((dirType) => {
            const /** @type {?} */ compMeta = this._metadataResolver.getDirectiveMetadata(/** @type {?} */ (dirType));
            if (!compMeta.isComponent) {
                return Promise.resolve(null);
            }
            const /** @type {?} */ ngModule = ngModuleByPipeOrDirective.get(dirType);
            if (!ngModule) {
                throw new Error(`Internal Error: cannot determine the module for component ${identifierName(compMeta.type)}!`);
            }
            _assertComponent(compMeta);
            // compile styles
            const /** @type {?} */ stylesCompileResults = this._styleCompiler.compileComponent(compMeta);
            stylesCompileResults.externalStylesheets.forEach((compiledStyleSheet) => {
                generatedFiles.push(this._codgenStyles(srcFileUrl, compiledStyleSheet, fileSuffix));
            });
            // compile components
            exportedVars.push(this._compileComponentFactory(compMeta, ngModule, fileSuffix, statements), this._compileComponent(compMeta, ngModule, ngModule.transitiveModule.directives, stylesCompileResults.componentStylesheet, fileSuffix, statements));
        });
        if (statements.length > 0) {
            const /** @type {?} */ srcModule = this._codegenSourceModule(srcFileUrl, _ngfactoryModuleUrl(srcFileUrl), statements, exportedVars);
            generatedFiles.unshift(srcModule);
        }
        return generatedFiles;
    }
    /**
     * @param {?} ngModuleType
     * @param {?} targetStatements
     * @return {?}
     */
    _compileModule(ngModuleType, targetStatements) {
        const /** @type {?} */ ngModule = this._metadataResolver.getNgModuleMetadata(ngModuleType);
        const /** @type {?} */ providers = [];
        if (this._localeId) {
            providers.push({
                token: createIdentifierToken(Identifiers.LOCALE_ID),
                useValue: this._localeId,
            });
        }
        if (this._translationFormat) {
            providers.push({
                token: createIdentifierToken(Identifiers.TRANSLATIONS_FORMAT),
                useValue: this._translationFormat
            });
        }
        const /** @type {?} */ appCompileResult = this._ngModuleCompiler.compile(ngModule, providers);
        appCompileResult.dependencies.forEach((dep) => {
            dep.placeholder.reference = this._staticReflector.getStaticSymbol(_ngfactoryModuleUrl(identifierModuleUrl(dep.comp)), _componentFactoryName(dep.comp));
        });
        targetStatements.push(...appCompileResult.statements);
        return appCompileResult.ngModuleFactoryVar;
    }
    /**
     * @param {?} directiveType
     * @param {?} targetStatements
     * @return {?}
     */
    _compileDirectiveWrapper(directiveType, targetStatements) {
        const /** @type {?} */ dirMeta = this._metadataResolver.getDirectiveMetadata(directiveType);
        const /** @type {?} */ dirCompileResult = this._dirWrapperCompiler.compile(dirMeta);
        targetStatements.push(...dirCompileResult.statements);
        return dirCompileResult.dirWrapperClassVar;
    }
    /**
     * @param {?} compMeta
     * @param {?} ngModule
     * @param {?} fileSuffix
     * @param {?} targetStatements
     * @return {?}
     */
    _compileComponentFactory(compMeta, ngModule, fileSuffix, targetStatements) {
        const /** @type {?} */ hostMeta = createHostComponentMeta(this._staticReflector.getStaticSymbol(identifierModuleUrl(compMeta.type), `${identifierName(compMeta.type)}_Host`), compMeta);
        const /** @type {?} */ hostViewFactoryVar = this._compileComponent(hostMeta, ngModule, [compMeta.type], null, fileSuffix, targetStatements);
        const /** @type {?} */ compFactoryVar = _componentFactoryName(compMeta.type);
        targetStatements.push(o.variable(compFactoryVar)
            .set(o.importExpr(createIdentifier(Identifiers.ComponentFactory), [o.importType(compMeta.type)])
            .instantiate([
            o.literal(compMeta.selector),
            o.variable(hostViewFactoryVar),
            o.importExpr(compMeta.type),
        ], o.importType(createIdentifier(Identifiers.ComponentFactory), [o.importType(compMeta.type)], [o.TypeModifier.Const])))
            .toDeclStmt(null, [o.StmtModifier.Final]));
        return compFactoryVar;
    }
    /**
     * @param {?} compMeta
     * @param {?} ngModule
     * @param {?} directiveIdentifiers
     * @param {?} componentStyles
     * @param {?} fileSuffix
     * @param {?} targetStatements
     * @return {?}
     */
    _compileComponent(compMeta, ngModule, directiveIdentifiers, componentStyles, fileSuffix, targetStatements) {
        const /** @type {?} */ parsedAnimations = this._animationParser.parseComponent(compMeta);
        const /** @type {?} */ directives = directiveIdentifiers.map(dir => this._metadataResolver.getDirectiveSummary(dir.reference));
        const /** @type {?} */ pipes = ngModule.transitiveModule.pipes.map(pipe => this._metadataResolver.getPipeSummary(pipe.reference));
        const /** @type {?} */ parsedTemplate = this._templateParser.parse(compMeta, compMeta.template.template, directives, pipes, ngModule.schemas, identifierName(compMeta.type));
        const /** @type {?} */ stylesExpr = componentStyles ? o.variable(componentStyles.stylesVar) : o.literalArr([]);
        const /** @type {?} */ compiledAnimations = this._animationCompiler.compile(identifierName(compMeta.type), parsedAnimations);
        const /** @type {?} */ viewResult = this._viewCompiler.compileComponent(compMeta, parsedTemplate, stylesExpr, pipes, compiledAnimations);
        if (componentStyles) {
            targetStatements.push(..._resolveStyleStatements(this._staticReflector, componentStyles, fileSuffix));
        }
        compiledAnimations.forEach(entry => targetStatements.push(...entry.statements));
        targetStatements.push(..._resolveViewStatements(this._staticReflector, viewResult));
        return viewResult.viewClassVar;
    }
    /**
     * @param {?} fileUrl
     * @param {?} stylesCompileResult
     * @param {?} fileSuffix
     * @return {?}
     */
    _codgenStyles(fileUrl, stylesCompileResult, fileSuffix) {
        _resolveStyleStatements(this._staticReflector, stylesCompileResult, fileSuffix);
        return this._codegenSourceModule(fileUrl, _stylesModuleUrl(stylesCompileResult.meta.moduleUrl, stylesCompileResult.isShimmed, fileSuffix), stylesCompileResult.statements, [stylesCompileResult.stylesVar]);
    }
    /**
     * @param {?} srcFileUrl
     * @param {?} genFileUrl
     * @param {?} statements
     * @param {?} exportedVars
     * @return {?}
     */
    _codegenSourceModule(srcFileUrl, genFileUrl, statements, exportedVars) {
        return new GeneratedFile(srcFileUrl, genFileUrl, this._outputEmitter.emitStatements(genFileUrl, statements, exportedVars));
    }
}
function AotCompiler_tsickle_Closure_declarations() {
    /** @type {?} */
    AotCompiler.prototype._animationCompiler;
    /** @type {?} */
    AotCompiler.prototype._metadataResolver;
    /** @type {?} */
    AotCompiler.prototype._templateParser;
    /** @type {?} */
    AotCompiler.prototype._styleCompiler;
    /** @type {?} */
    AotCompiler.prototype._viewCompiler;
    /** @type {?} */
    AotCompiler.prototype._dirWrapperCompiler;
    /** @type {?} */
    AotCompiler.prototype._ngModuleCompiler;
    /** @type {?} */
    AotCompiler.prototype._outputEmitter;
    /** @type {?} */
    AotCompiler.prototype._summaryResolver;
    /** @type {?} */
    AotCompiler.prototype._localeId;
    /** @type {?} */
    AotCompiler.prototype._translationFormat;
    /** @type {?} */
    AotCompiler.prototype._animationParser;
    /** @type {?} */
    AotCompiler.prototype._staticReflector;
    /** @type {?} */
    AotCompiler.prototype._options;
}
/**
 * @param {?} reflector
 * @param {?} compileResult
 * @return {?}
 */
function _resolveViewStatements(reflector, compileResult) {
    compileResult.dependencies.forEach((dep) => {
        if (dep instanceof ViewClassDependency) {
            const /** @type {?} */ vfd = (dep);
            vfd.placeholder.reference =
                reflector.getStaticSymbol(_ngfactoryModuleUrl(identifierModuleUrl(vfd.comp)), dep.name);
        }
        else if (dep instanceof ComponentFactoryDependency) {
            const /** @type {?} */ cfd = (dep);
            cfd.placeholder.reference = reflector.getStaticSymbol(_ngfactoryModuleUrl(identifierModuleUrl(cfd.comp)), _componentFactoryName(cfd.comp));
        }
        else if (dep instanceof DirectiveWrapperDependency) {
            const /** @type {?} */ dwd = (dep);
            dwd.placeholder.reference =
                reflector.getStaticSymbol(_ngfactoryModuleUrl(identifierModuleUrl(dwd.dir)), dwd.name);
        }
    });
    return compileResult.statements;
}
/**
 * @param {?} reflector
 * @param {?} compileResult
 * @param {?} fileSuffix
 * @return {?}
 */
function _resolveStyleStatements(reflector, compileResult, fileSuffix) {
    compileResult.dependencies.forEach((dep) => {
        dep.valuePlaceholder.reference = reflector.getStaticSymbol(_stylesModuleUrl(dep.moduleUrl, dep.isShimmed, fileSuffix), dep.name);
    });
    return compileResult.statements;
}
/**
 * @param {?} dirUrl
 * @return {?}
 */
function _ngfactoryModuleUrl(dirUrl) {
    const /** @type {?} */ urlWithSuffix = _splitTypescriptSuffix(dirUrl);
    return `${urlWithSuffix[0]}.ngfactory${urlWithSuffix[1]}`;
}
/**
 * @param {?} comp
 * @return {?}
 */
function _componentFactoryName(comp) {
    return `${identifierName(comp)}NgFactory`;
}
/**
 * @param {?} stylesheetUrl
 * @param {?} shim
 * @param {?} suffix
 * @return {?}
 */
function _stylesModuleUrl(stylesheetUrl, shim, suffix) {
    return `${stylesheetUrl}${shim ? '.shim' : ''}.ngstyle${suffix}`;
}
/**
 * @param {?} meta
 * @return {?}
 */
function _assertComponent(meta) {
    if (!meta.isComponent) {
        throw new Error(`Could not compile '${identifierName(meta.type)}' because it is not a component.`);
    }
}
/**
 * @param {?} path
 * @return {?}
 */
function _splitTypescriptSuffix(path) {
    if (path.endsWith('.d.ts')) {
        return [path.slice(0, -5), '.ts'];
    }
    const /** @type {?} */ lastDot = path.lastIndexOf('.');
    if (lastDot !== -1) {
        return [path.substring(0, lastDot), path.substring(lastDot)];
    }
    return [path, ''];
}
/**
 * @param {?} programStaticSymbols
 * @param {?} options
 * @param {?} metadataResolver
 * @return {?}
 */
export function analyzeNgModules(programStaticSymbols, options, metadataResolver) {
    const { ngModules, symbolsMissingModule } = _createNgModules(programStaticSymbols, options, metadataResolver);
    return _analyzeNgModules(ngModules, symbolsMissingModule);
}
/**
 * @param {?} programStaticSymbols
 * @param {?} options
 * @param {?} metadataResolver
 * @return {?}
 */
export function analyzeAndValidateNgModules(programStaticSymbols, options, metadataResolver) {
    const /** @type {?} */ result = analyzeNgModules(programStaticSymbols, options, metadataResolver);
    if (result.symbolsMissingModule && result.symbolsMissingModule.length) {
        const /** @type {?} */ messages = result.symbolsMissingModule.map(s => `Cannot determine the module for class ${s.name} in ${s.filePath}!`);
        throw new Error(messages.join('\n'));
    }
    return result;
}
/**
 * @param {?} ngModuleMetas
 * @param {?} symbolsMissingModule
 * @return {?}
 */
function _analyzeNgModules(ngModuleMetas, symbolsMissingModule) {
    const /** @type {?} */ moduleMetasByRef = new Map();
    ngModuleMetas.forEach((ngModule) => moduleMetasByRef.set(ngModule.type.reference, ngModule));
    const /** @type {?} */ ngModuleByPipeOrDirective = new Map();
    const /** @type {?} */ ngModulesByFile = new Map();
    const /** @type {?} */ ngDirectivesByFile = new Map();
    const /** @type {?} */ ngPipesByFile = new Map();
    const /** @type {?} */ filePaths = new Set();
    // Looping over all modules to construct:
    // - a map from file to modules `ngModulesByFile`,
    // - a map from file to directives `ngDirectivesByFile`,
    // - a map from file to pipes `ngPipesByFile`,
    // - a map from directive/pipe to module `ngModuleByPipeOrDirective`.
    ngModuleMetas.forEach((ngModuleMeta) => {
        const /** @type {?} */ srcFileUrl = ngModuleMeta.type.reference.filePath;
        filePaths.add(srcFileUrl);
        ngModulesByFile.set(srcFileUrl, (ngModulesByFile.get(srcFileUrl) || []).concat(ngModuleMeta.type.reference));
        ngModuleMeta.declaredDirectives.forEach((dirIdentifier) => {
            const /** @type {?} */ fileUrl = dirIdentifier.reference.filePath;
            filePaths.add(fileUrl);
            ngDirectivesByFile.set(fileUrl, (ngDirectivesByFile.get(fileUrl) || []).concat(dirIdentifier.reference));
            ngModuleByPipeOrDirective.set(dirIdentifier.reference, ngModuleMeta);
        });
        ngModuleMeta.declaredPipes.forEach((pipeIdentifier) => {
            const /** @type {?} */ fileUrl = pipeIdentifier.reference.filePath;
            filePaths.add(fileUrl);
            ngPipesByFile.set(fileUrl, (ngPipesByFile.get(fileUrl) || []).concat(pipeIdentifier.reference));
            ngModuleByPipeOrDirective.set(pipeIdentifier.reference, ngModuleMeta);
        });
    });
    const /** @type {?} */ files = [];
    filePaths.forEach((srcUrl) => {
        const /** @type {?} */ directives = ngDirectivesByFile.get(srcUrl) || [];
        const /** @type {?} */ pipes = ngPipesByFile.get(srcUrl) || [];
        const /** @type {?} */ ngModules = ngModulesByFile.get(srcUrl) || [];
        files.push({ srcUrl, directives, pipes, ngModules });
    });
    return {
        // map directive/pipe to module
        ngModuleByPipeOrDirective,
        // list modules and directives for every source file
        files,
        ngModules: ngModuleMetas, symbolsMissingModule
    };
}
/**
 * @param {?} staticReflector
 * @param {?} files
 * @param {?=} options
 * @return {?}
 */
export function extractProgramSymbols(staticReflector, files, options = {}) {
    const /** @type {?} */ staticSymbols = [];
    files.filter(fileName => filterFileByPatterns(fileName, options)).forEach(sourceFile => {
        const /** @type {?} */ moduleMetadata = staticReflector.getModuleMetadata(sourceFile);
        if (!moduleMetadata) {
            console.error(`WARNING: no metadata found for ${sourceFile}`);
            return;
        }
        const /** @type {?} */ metadata = moduleMetadata['metadata'];
        if (!metadata) {
            return;
        }
        for (const symbol of Object.keys(metadata)) {
            if (metadata[symbol] && metadata[symbol].__symbolic == 'error') {
                // Ignore symbols that are only included to record error information.
                continue;
            }
            staticSymbols.push(staticReflector.getStaticSymbol(sourceFile, symbol));
        }
    });
    return staticSymbols;
}
/**
 * @param {?} programStaticSymbols
 * @param {?} options
 * @param {?} metadataResolver
 * @return {?}
 */
function _createNgModules(programStaticSymbols, options, metadataResolver) {
    const /** @type {?} */ ngModules = new Map();
    const /** @type {?} */ programPipesAndDirectives = [];
    const /** @type {?} */ ngModulePipesAndDirective = new Set();
    const /** @type {?} */ addNgModule = (staticSymbol) => {
        if (ngModules.has(staticSymbol) || !filterFileByPatterns(staticSymbol.filePath, options)) {
            return false;
        }
        const /** @type {?} */ ngModule = metadataResolver.getNgModuleMetadata(staticSymbol, false);
        if (ngModule) {
            ngModules.set(ngModule.type.reference, ngModule);
            ngModule.declaredDirectives.forEach((dir) => ngModulePipesAndDirective.add(dir.reference));
            ngModule.declaredPipes.forEach((pipe) => ngModulePipesAndDirective.add(pipe.reference));
            // For every input module add the list of transitively included modules
            ngModule.transitiveModule.modules.forEach(modMeta => addNgModule(modMeta.reference));
        }
        return !!ngModule;
    };
    programStaticSymbols.forEach((staticSymbol) => {
        if (!addNgModule(staticSymbol) &&
            (metadataResolver.isDirective(staticSymbol) || metadataResolver.isPipe(staticSymbol))) {
            programPipesAndDirectives.push(staticSymbol);
        }
    });
    // Throw an error if any of the program pipe or directives is not declared by a module
    const /** @type {?} */ symbolsMissingModule = programPipesAndDirectives.filter(s => !ngModulePipesAndDirective.has(s));
    return { ngModules: Array.from(ngModules.values()), symbolsMissingModule };
}
//# sourceMappingURL=compiler.js.map