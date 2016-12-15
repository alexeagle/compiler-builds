/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { AnimationAnimateMetadata, AnimationGroupMetadata, AnimationKeyframesSequenceMetadata, AnimationStateDeclarationMetadata, AnimationStateTransitionMetadata, AnimationStyleMetadata, AnimationWithStepsMetadata, Attribute, Component, Host, Inject, Injectable, OpaqueToken, Optional, Self, SkipSelf, Type, resolveForwardRef } from '@angular/core/index';
import { StaticSymbol } from './aot/static_symbol';
import { assertArrayOfStrings, assertInterpolationSymbols } from './assertions';
import * as cpl from './compile_metadata';
import { DirectiveNormalizer } from './directive_normalizer';
import { DirectiveResolver } from './directive_resolver';
import { isBlank, isPresent, stringify } from './facade/lang';
import { Identifiers, resolveIdentifier } from './identifiers';
import { hasLifecycleHook } from './lifecycle_reflector';
import { NgModuleResolver } from './ng_module_resolver';
import { PipeResolver } from './pipe_resolver';
import { ComponentStillLoadingError, LIFECYCLE_HOOKS_VALUES, ReflectorReader, reflector } from './private_import_core';
import { ElementSchemaRegistry } from './schema/element_schema_registry';
import { SummaryResolver } from './summary_resolver';
import { getUrlScheme } from './url_resolver';
import { MODULE_SUFFIX, ValueTransformer, visitValue } from './util';
export const /** @type {?} */ ERROR_COLLECTOR_TOKEN = new OpaqueToken('ErrorCollector');
export class CompileMetadataResolver {
    /**
     * @param {?} _ngModuleResolver
     * @param {?} _directiveResolver
     * @param {?} _pipeResolver
     * @param {?} _summaryResolver
     * @param {?} _schemaRegistry
     * @param {?} _directiveNormalizer
     * @param {?=} _reflector
     * @param {?=} _errorCollector
     */
    constructor(_ngModuleResolver, _directiveResolver, _pipeResolver, _summaryResolver, _schemaRegistry, _directiveNormalizer, _reflector = reflector, _errorCollector) {
        this._ngModuleResolver = _ngModuleResolver;
        this._directiveResolver = _directiveResolver;
        this._pipeResolver = _pipeResolver;
        this._summaryResolver = _summaryResolver;
        this._schemaRegistry = _schemaRegistry;
        this._directiveNormalizer = _directiveNormalizer;
        this._reflector = _reflector;
        this._errorCollector = _errorCollector;
        this._directiveCache = new Map();
        this._summaryCache = new Map();
        this._pipeCache = new Map();
        this._ngModuleCache = new Map();
        this._ngModuleOfTypes = new Map();
    }
    /**
     * @param {?} type
     * @return {?}
     */
    clearCacheFor(type) {
        const /** @type {?} */ dirMeta = this._directiveCache.get(type);
        this._directiveCache.delete(type);
        this._summaryCache.delete(type);
        this._pipeCache.delete(type);
        this._ngModuleOfTypes.delete(type);
        // Clear all of the NgModule as they contain transitive information!
        this._ngModuleCache.clear();
        if (dirMeta) {
            this._directiveNormalizer.clearCacheFor(dirMeta);
        }
    }
    /**
     * @return {?}
     */
    clearCache() {
        this._directiveCache.clear();
        this._summaryCache.clear();
        this._pipeCache.clear();
        this._ngModuleCache.clear();
        this._ngModuleOfTypes.clear();
        this._directiveNormalizer.clearCache();
    }
    /**
     * @param {?} entry
     * @return {?}
     */
    getAnimationEntryMetadata(entry) {
        const /** @type {?} */ defs = entry.definitions.map(def => this._getAnimationStateMetadata(def));
        return new cpl.CompileAnimationEntryMetadata(entry.name, defs);
    }
    /**
     * @param {?} value
     * @return {?}
     */
    _getAnimationStateMetadata(value) {
        if (value instanceof AnimationStateDeclarationMetadata) {
            const /** @type {?} */ styles = this._getAnimationStyleMetadata(value.styles);
            return new cpl.CompileAnimationStateDeclarationMetadata(value.stateNameExpr, styles);
        }
        if (value instanceof AnimationStateTransitionMetadata) {
            return new cpl.CompileAnimationStateTransitionMetadata(value.stateChangeExpr, this._getAnimationMetadata(value.steps));
        }
        return null;
    }
    /**
     * @param {?} value
     * @return {?}
     */
    _getAnimationStyleMetadata(value) {
        return new cpl.CompileAnimationStyleMetadata(value.offset, value.styles);
    }
    /**
     * @param {?} value
     * @return {?}
     */
    _getAnimationMetadata(value) {
        if (value instanceof AnimationStyleMetadata) {
            return this._getAnimationStyleMetadata(value);
        }
        if (value instanceof AnimationKeyframesSequenceMetadata) {
            return new cpl.CompileAnimationKeyframesSequenceMetadata(value.steps.map(entry => this._getAnimationStyleMetadata(entry)));
        }
        if (value instanceof AnimationAnimateMetadata) {
            const /** @type {?} */ animateData = (this
                ._getAnimationMetadata(value.styles));
            return new cpl.CompileAnimationAnimateMetadata(value.timings, animateData);
        }
        if (value instanceof AnimationWithStepsMetadata) {
            const /** @type {?} */ steps = value.steps.map(step => this._getAnimationMetadata(step));
            if (value instanceof AnimationGroupMetadata) {
                return new cpl.CompileAnimationGroupMetadata(steps);
            }
            return new cpl.CompileAnimationSequenceMetadata(steps);
        }
        return null;
    }
    /**
     * @param {?} type
     * @param {?} kind
     * @return {?}
     */
    _loadSummary(type, kind) {
        let /** @type {?} */ summary = this._summaryCache.get(type);
        if (!summary) {
            summary = this._summaryResolver.resolveSummary(type);
            this._summaryCache.set(type, summary);
        }
        return summary && summary.summaryKind === kind ? summary : null;
    }
    /**
     * @param {?} directiveType
     * @param {?} isSync
     * @return {?}
     */
    _loadDirectiveMetadata(directiveType, isSync) {
        if (this._directiveCache.has(directiveType)) {
            return;
        }
        directiveType = resolveForwardRef(directiveType);
        const { annotation, metadata } = this.getNonNormalizedDirectiveMetadata(directiveType);
        const /** @type {?} */ createDirectiveMetadata = (templateMetadata) => {
            const /** @type {?} */ normalizedDirMeta = new cpl.CompileDirectiveMetadata({
                type: metadata.type,
                isComponent: metadata.isComponent,
                selector: metadata.selector,
                exportAs: metadata.exportAs,
                changeDetection: metadata.changeDetection,
                inputs: metadata.inputs,
                outputs: metadata.outputs,
                hostListeners: metadata.hostListeners,
                hostProperties: metadata.hostProperties,
                hostAttributes: metadata.hostAttributes,
                providers: metadata.providers,
                viewProviders: metadata.viewProviders,
                queries: metadata.queries,
                viewQueries: metadata.viewQueries,
                entryComponents: metadata.entryComponents,
                template: templateMetadata
            });
            this._directiveCache.set(directiveType, normalizedDirMeta);
            this._summaryCache.set(directiveType, normalizedDirMeta.toSummary());
            return normalizedDirMeta;
        };
        if (metadata.isComponent) {
            const /** @type {?} */ templateMeta = this._directiveNormalizer.normalizeTemplate({
                componentType: directiveType,
                moduleUrl: componentModuleUrl(this._reflector, directiveType, annotation),
                encapsulation: metadata.template.encapsulation,
                template: metadata.template.template,
                templateUrl: metadata.template.templateUrl,
                styles: metadata.template.styles,
                styleUrls: metadata.template.styleUrls,
                animations: metadata.template.animations,
                interpolation: metadata.template.interpolation
            });
            if (templateMeta.syncResult) {
                createDirectiveMetadata(templateMeta.syncResult);
                return null;
            }
            else {
                if (isSync) {
                    this._reportError(new ComponentStillLoadingError(directiveType), directiveType);
                    return null;
                }
                return templateMeta.asyncResult.then(createDirectiveMetadata);
            }
        }
        else {
            // directive
            createDirectiveMetadata(null);
            return null;
        }
    }
    /**
     * @param {?} directiveType
     * @return {?}
     */
    getNonNormalizedDirectiveMetadata(directiveType) {
        directiveType = resolveForwardRef(directiveType);
        const /** @type {?} */ dirMeta = this._directiveResolver.resolve(directiveType);
        if (!dirMeta) {
            return null;
        }
        let /** @type {?} */ nonNormalizedTemplateMetadata;
        if (dirMeta instanceof Component) {
            // component
            assertArrayOfStrings('styles', dirMeta.styles);
            assertArrayOfStrings('styleUrls', dirMeta.styleUrls);
            assertInterpolationSymbols('interpolation', dirMeta.interpolation);
            const /** @type {?} */ animations = dirMeta.animations ?
                dirMeta.animations.map(e => this.getAnimationEntryMetadata(e)) :
                null;
            nonNormalizedTemplateMetadata = new cpl.CompileTemplateMetadata({
                encapsulation: dirMeta.encapsulation,
                template: dirMeta.template,
                templateUrl: dirMeta.templateUrl,
                styles: dirMeta.styles,
                styleUrls: dirMeta.styleUrls,
                animations: animations,
                interpolation: dirMeta.interpolation
            });
        }
        let /** @type {?} */ changeDetectionStrategy = null;
        let /** @type {?} */ viewProviders = [];
        let /** @type {?} */ entryComponentMetadata = [];
        let /** @type {?} */ selector = dirMeta.selector;
        if (dirMeta instanceof Component) {
            // Component
            changeDetectionStrategy = dirMeta.changeDetection;
            if (dirMeta.viewProviders) {
                viewProviders = this._getProvidersMetadata(dirMeta.viewProviders, entryComponentMetadata, `viewProviders for "${stringify(directiveType)}"`, [], directiveType);
            }
            if (dirMeta.entryComponents) {
                entryComponentMetadata = flattenAndDedupeArray(dirMeta.entryComponents)
                    .map((type) => this._getIdentifierMetadata(type))
                    .concat(entryComponentMetadata);
            }
            if (!selector) {
                selector = this._schemaRegistry.getDefaultComponentElementName();
            }
        }
        else {
            // Directive
            if (!selector) {
                this._reportError(new Error(`Directive ${stringify(directiveType)} has no selector, please add it!`), directiveType);
                selector = 'error';
            }
        }
        let /** @type {?} */ providers = [];
        if (isPresent(dirMeta.providers)) {
            providers = this._getProvidersMetadata(dirMeta.providers, entryComponentMetadata, `providers for "${stringify(directiveType)}"`, [], directiveType);
        }
        let /** @type {?} */ queries = [];
        let /** @type {?} */ viewQueries = [];
        if (isPresent(dirMeta.queries)) {
            queries = this._getQueriesMetadata(dirMeta.queries, false, directiveType);
            viewQueries = this._getQueriesMetadata(dirMeta.queries, true, directiveType);
        }
        const /** @type {?} */ metadata = cpl.CompileDirectiveMetadata.create({
            selector: selector,
            exportAs: dirMeta.exportAs,
            isComponent: !!nonNormalizedTemplateMetadata,
            type: this._getTypeMetadata(directiveType),
            template: nonNormalizedTemplateMetadata,
            changeDetection: changeDetectionStrategy,
            inputs: dirMeta.inputs,
            outputs: dirMeta.outputs,
            host: dirMeta.host,
            providers: providers,
            viewProviders: viewProviders,
            queries: queries,
            viewQueries: viewQueries,
            entryComponents: entryComponentMetadata
        });
        return { metadata, annotation: dirMeta };
    }
    /**
     * Gets the metadata for the given directive.
     * This assumes `loadNgModuleMetadata` has been called first.
     * @param {?} directiveType
     * @return {?}
     */
    getDirectiveMetadata(directiveType) {
        const /** @type {?} */ dirMeta = this._directiveCache.get(directiveType);
        if (!dirMeta) {
            this._reportError(new Error(`Illegal state: getDirectiveMetadata can only be called after loadNgModuleMetadata for a module that declares it. Directive ${stringify(directiveType)}.`), directiveType);
        }
        return dirMeta;
    }
    /**
     * @param {?} dirType
     * @return {?}
     */
    getDirectiveSummary(dirType) {
        const /** @type {?} */ dirSummary = (this._loadSummary(dirType, cpl.CompileSummaryKind.Directive));
        if (!dirSummary) {
            this._reportError(new Error(`Illegal state: Could not load the summary for directive ${stringify(dirType)}.`), dirType);
        }
        return dirSummary;
    }
    /**
     * @param {?} type
     * @return {?}
     */
    isDirective(type) { return this._directiveResolver.isDirective(type); }
    /**
     * @param {?} type
     * @return {?}
     */
    isPipe(type) { return this._pipeResolver.isPipe(type); }
    /**
     * @param {?} moduleType
     * @return {?}
     */
    getNgModuleSummary(moduleType) {
        let /** @type {?} */ moduleSummary = (this._loadSummary(moduleType, cpl.CompileSummaryKind.NgModule));
        if (!moduleSummary) {
            const /** @type {?} */ moduleMeta = this.getNgModuleMetadata(moduleType, false);
            moduleSummary = moduleMeta ? moduleMeta.toSummary() : null;
            if (moduleSummary) {
                this._summaryCache.set(moduleType, moduleSummary);
            }
        }
        return moduleSummary;
    }
    /**
     * Loads the declared directives and pipes of an NgModule.
     * @param {?} moduleType
     * @param {?} isSync
     * @param {?=} throwIfNotFound
     * @return {?}
     */
    loadNgModuleDirectiveAndPipeMetadata(moduleType, isSync, throwIfNotFound = true) {
        const /** @type {?} */ ngModule = this.getNgModuleMetadata(moduleType, throwIfNotFound);
        const /** @type {?} */ loading = [];
        if (ngModule) {
            ngModule.declaredDirectives.forEach((id) => {
                const /** @type {?} */ promise = this._loadDirectiveMetadata(id.reference, isSync);
                if (promise) {
                    loading.push(promise);
                }
            });
            ngModule.declaredPipes.forEach((id) => this._loadPipeMetadata(id.reference));
        }
        return Promise.all(loading);
    }
    /**
     * @param {?} moduleType
     * @param {?=} throwIfNotFound
     * @return {?}
     */
    getNgModuleMetadata(moduleType, throwIfNotFound = true) {
        moduleType = resolveForwardRef(moduleType);
        let /** @type {?} */ compileMeta = this._ngModuleCache.get(moduleType);
        if (compileMeta) {
            return compileMeta;
        }
        const /** @type {?} */ meta = this._ngModuleResolver.resolve(moduleType, throwIfNotFound);
        if (!meta) {
            return null;
        }
        const /** @type {?} */ declaredDirectives = [];
        const /** @type {?} */ exportedNonModuleIdentifiers = [];
        const /** @type {?} */ declaredPipes = [];
        const /** @type {?} */ importedModules = [];
        const /** @type {?} */ exportedModules = [];
        const /** @type {?} */ providers = [];
        const /** @type {?} */ entryComponents = [];
        const /** @type {?} */ bootstrapComponents = [];
        const /** @type {?} */ schemas = [];
        if (meta.imports) {
            flattenAndDedupeArray(meta.imports).forEach((importedType) => {
                let /** @type {?} */ importedModuleType;
                if (isValidType(importedType)) {
                    importedModuleType = importedType;
                }
                else if (importedType && importedType.ngModule) {
                    const /** @type {?} */ moduleWithProviders = importedType;
                    importedModuleType = moduleWithProviders.ngModule;
                    if (moduleWithProviders.providers) {
                        providers.push(...this._getProvidersMetadata(moduleWithProviders.providers, entryComponents, `provider for the NgModule '${stringify(importedModuleType)}'`, [], importedType));
                    }
                }
                if (importedModuleType) {
                    const /** @type {?} */ importedModuleSummary = this.getNgModuleSummary(importedModuleType);
                    if (!importedModuleSummary) {
                        this._reportError(new Error(`Unexpected ${this._getTypeDescriptor(importedType)} '${stringify(importedType)}' imported by the module '${stringify(moduleType)}'`), moduleType);
                        return;
                    }
                    importedModules.push(importedModuleSummary);
                }
                else {
                    this._reportError(new Error(`Unexpected value '${stringify(importedType)}' imported by the module '${stringify(moduleType)}'`), moduleType);
                    return;
                }
            });
        }
        if (meta.exports) {
            flattenAndDedupeArray(meta.exports).forEach((exportedType) => {
                if (!isValidType(exportedType)) {
                    this._reportError(new Error(`Unexpected value '${stringify(exportedType)}' exported by the module '${stringify(moduleType)}'`), moduleType);
                    return;
                }
                const /** @type {?} */ exportedModuleSummary = this.getNgModuleSummary(exportedType);
                if (exportedModuleSummary) {
                    exportedModules.push(exportedModuleSummary);
                }
                else {
                    exportedNonModuleIdentifiers.push(this._getIdentifierMetadata(exportedType));
                }
            });
        }
        // Note: This will be modified later, so we rely on
        // getting a new instance every time!
        const /** @type {?} */ transitiveModule = this._getTransitiveNgModuleMetadata(importedModules, exportedModules);
        if (meta.declarations) {
            flattenAndDedupeArray(meta.declarations).forEach((declaredType) => {
                if (!isValidType(declaredType)) {
                    this._reportError(new Error(`Unexpected value '${stringify(declaredType)}' declared by the module '${stringify(moduleType)}'`), moduleType);
                    return;
                }
                const /** @type {?} */ declaredIdentifier = this._getIdentifierMetadata(declaredType);
                if (this._directiveResolver.isDirective(declaredType)) {
                    transitiveModule.addDirective(declaredIdentifier);
                    declaredDirectives.push(declaredIdentifier);
                    this._addTypeToModule(declaredType, moduleType);
                }
                else if (this._pipeResolver.isPipe(declaredType)) {
                    transitiveModule.addPipe(declaredIdentifier);
                    transitiveModule.pipes.push(declaredIdentifier);
                    declaredPipes.push(declaredIdentifier);
                    this._addTypeToModule(declaredType, moduleType);
                }
                else {
                    this._reportError(new Error(`Unexpected ${this._getTypeDescriptor(declaredType)} '${stringify(declaredType)}' declared by the module '${stringify(moduleType)}'`), moduleType);
                    return;
                }
            });
        }
        const /** @type {?} */ exportedDirectives = [];
        const /** @type {?} */ exportedPipes = [];
        exportedNonModuleIdentifiers.forEach((exportedId) => {
            if (transitiveModule.directivesSet.has(exportedId.reference)) {
                exportedDirectives.push(exportedId);
                transitiveModule.addExportedDirective(exportedId);
            }
            else if (transitiveModule.pipesSet.has(exportedId.reference)) {
                exportedPipes.push(exportedId);
                transitiveModule.addExportedPipe(exportedId);
            }
            else {
                this._reportError(new Error(`Can't export ${this._getTypeDescriptor(exportedId.reference)} ${stringify(exportedId.reference)} from ${stringify(moduleType)} as it was neither declared nor imported!`), moduleType);
            }
        });
        // The providers of the module have to go last
        // so that they overwrite any other provider we already added.
        if (meta.providers) {
            providers.push(...this._getProvidersMetadata(meta.providers, entryComponents, `provider for the NgModule '${stringify(moduleType)}'`, [], moduleType));
        }
        if (meta.entryComponents) {
            entryComponents.push(...flattenAndDedupeArray(meta.entryComponents).map(type => this._getTypeMetadata(type)));
        }
        if (meta.bootstrap) {
            flattenAndDedupeArray(meta.bootstrap).forEach(type => {
                if (!isValidType(type)) {
                    this._reportError(new Error(`Unexpected value '${stringify(type)}' used in the bootstrap property of module '${stringify(moduleType)}'`), moduleType);
                    return;
                }
                bootstrapComponents.push(this._getTypeMetadata(type));
            });
        }
        entryComponents.push(...bootstrapComponents);
        if (meta.schemas) {
            schemas.push(...flattenAndDedupeArray(meta.schemas));
        }
        compileMeta = new cpl.CompileNgModuleMetadata({
            type: this._getTypeMetadata(moduleType),
            providers,
            entryComponents,
            bootstrapComponents,
            schemas,
            declaredDirectives,
            exportedDirectives,
            declaredPipes,
            exportedPipes,
            importedModules,
            exportedModules,
            transitiveModule,
            id: meta.id,
        });
        entryComponents.forEach((id) => transitiveModule.addEntryComponent(id));
        providers.forEach((provider) => transitiveModule.addProvider(provider, compileMeta.type));
        transitiveModule.addModule(compileMeta.type);
        this._ngModuleCache.set(moduleType, compileMeta);
        return compileMeta;
    }
    /**
     * @param {?} type
     * @return {?}
     */
    _getTypeDescriptor(type) {
        if (this._directiveResolver.isDirective(type)) {
            return 'directive';
        }
        if (this._pipeResolver.isPipe(type)) {
            return 'pipe';
        }
        if (this._ngModuleResolver.isNgModule(type)) {
            return 'module';
        }
        if (((type)).provide) {
            return 'provider';
        }
        return 'value';
    }
    /**
     * @param {?} type
     * @param {?} moduleType
     * @return {?}
     */
    _addTypeToModule(type, moduleType) {
        const /** @type {?} */ oldModule = this._ngModuleOfTypes.get(type);
        if (oldModule && oldModule !== moduleType) {
            this._reportError(new Error(`Type ${stringify(type)} is part of the declarations of 2 modules: ${stringify(oldModule)} and ${stringify(moduleType)}! ` +
                `Please consider moving ${stringify(type)} to a higher module that imports ${stringify(oldModule)} and ${stringify(moduleType)}. ` +
                `You can also create a new NgModule that exports and includes ${stringify(type)} then import that NgModule in ${stringify(oldModule)} and ${stringify(moduleType)}.`), moduleType);
        }
        this._ngModuleOfTypes.set(type, moduleType);
    }
    /**
     * @param {?} importedModules
     * @param {?} exportedModules
     * @return {?}
     */
    _getTransitiveNgModuleMetadata(importedModules, exportedModules) {
        // collect `providers` / `entryComponents` from all imported and all exported modules
        const /** @type {?} */ result = new cpl.TransitiveCompileNgModuleMetadata();
        const /** @type {?} */ modulesByToken = new Map();
        importedModules.concat(exportedModules).forEach((modSummary) => {
            modSummary.modules.forEach((mod) => result.addModule(mod));
            modSummary.entryComponents.forEach((comp) => result.addEntryComponent(comp));
            const /** @type {?} */ addedTokens = new Set();
            modSummary.providers.forEach((entry) => {
                const /** @type {?} */ tokenRef = cpl.tokenReference(entry.provider.token);
                let /** @type {?} */ prevModules = modulesByToken.get(tokenRef);
                if (!prevModules) {
                    prevModules = new Set();
                    modulesByToken.set(tokenRef, prevModules);
                }
                const /** @type {?} */ moduleRef = entry.module.reference;
                // Note: the providers of one module may still contain multiple providers
                // per token (e.g. for multi providers), and we need to preserve these.
                if (addedTokens.has(tokenRef) || !prevModules.has(moduleRef)) {
                    prevModules.add(moduleRef);
                    addedTokens.add(tokenRef);
                    result.addProvider(entry.provider, entry.module);
                }
            });
        });
        exportedModules.forEach((modSummary) => {
            modSummary.exportedDirectives.forEach((id) => result.addExportedDirective(id));
            modSummary.exportedPipes.forEach((id) => result.addExportedPipe(id));
        });
        importedModules.forEach((modSummary) => {
            modSummary.exportedDirectives.forEach((id) => result.addDirective(id));
            modSummary.exportedPipes.forEach((id) => result.addPipe(id));
        });
        return result;
    }
    /**
     * @param {?} type
     * @return {?}
     */
    _getIdentifierMetadata(type) {
        type = resolveForwardRef(type);
        return { reference: type };
    }
    /**
     * @param {?} type
     * @param {?=} dependencies
     * @return {?}
     */
    _getTypeMetadata(type, dependencies = null) {
        const /** @type {?} */ identifier = this._getIdentifierMetadata(type);
        return {
            reference: identifier.reference,
            diDeps: this._getDependenciesMetadata(identifier.reference, dependencies),
            lifecycleHooks: LIFECYCLE_HOOKS_VALUES.filter(hook => hasLifecycleHook(hook, identifier.reference)),
        };
    }
    /**
     * @param {?} factory
     * @param {?=} dependencies
     * @return {?}
     */
    _getFactoryMetadata(factory, dependencies = null) {
        factory = resolveForwardRef(factory);
        return { reference: factory, diDeps: this._getDependenciesMetadata(factory, dependencies) };
    }
    /**
     * Gets the metadata for the given pipe.
     * This assumes `loadNgModuleMetadata` has been called first.
     * @param {?} pipeType
     * @return {?}
     */
    getPipeMetadata(pipeType) {
        const /** @type {?} */ pipeMeta = this._pipeCache.get(pipeType);
        if (!pipeMeta) {
            this._reportError(new Error(`Illegal state: getPipeMetadata can only be called after loadNgModuleMetadata for a module that declares it. Pipe ${stringify(pipeType)}.`), pipeType);
        }
        return pipeMeta;
    }
    /**
     * @param {?} pipeType
     * @return {?}
     */
    getPipeSummary(pipeType) {
        const /** @type {?} */ pipeSummary = (this._loadSummary(pipeType, cpl.CompileSummaryKind.Pipe));
        if (!pipeSummary) {
            this._reportError(new Error(`Illegal state: Could not load the summary for pipe ${stringify(pipeType)}.`), pipeType);
        }
        return pipeSummary;
    }
    /**
     * @param {?} pipeType
     * @return {?}
     */
    getOrLoadPipeMetadata(pipeType) {
        let /** @type {?} */ pipeMeta = this._pipeCache.get(pipeType);
        if (!pipeMeta) {
            pipeMeta = this._loadPipeMetadata(pipeType);
        }
        return pipeMeta;
    }
    /**
     * @param {?} pipeType
     * @return {?}
     */
    _loadPipeMetadata(pipeType) {
        pipeType = resolveForwardRef(pipeType);
        const /** @type {?} */ pipeAnnotation = this._pipeResolver.resolve(pipeType);
        const /** @type {?} */ pipeMeta = new cpl.CompilePipeMetadata({
            type: this._getTypeMetadata(pipeType),
            name: pipeAnnotation.name,
            pure: pipeAnnotation.pure
        });
        this._pipeCache.set(pipeType, pipeMeta);
        this._summaryCache.set(pipeType, pipeMeta.toSummary());
        return pipeMeta;
    }
    /**
     * @param {?} typeOrFunc
     * @param {?} dependencies
     * @return {?}
     */
    _getDependenciesMetadata(typeOrFunc, dependencies) {
        let /** @type {?} */ hasUnknownDeps = false;
        const /** @type {?} */ params = dependencies || this._reflector.parameters(typeOrFunc) || [];
        const /** @type {?} */ dependenciesMetadata = params.map((param) => {
            let /** @type {?} */ isAttribute = false;
            let /** @type {?} */ isHost = false;
            let /** @type {?} */ isSelf = false;
            let /** @type {?} */ isSkipSelf = false;
            let /** @type {?} */ isOptional = false;
            let /** @type {?} */ token = null;
            if (Array.isArray(param)) {
                param.forEach((paramEntry) => {
                    if (paramEntry instanceof Host) {
                        isHost = true;
                    }
                    else if (paramEntry instanceof Self) {
                        isSelf = true;
                    }
                    else if (paramEntry instanceof SkipSelf) {
                        isSkipSelf = true;
                    }
                    else if (paramEntry instanceof Optional) {
                        isOptional = true;
                    }
                    else if (paramEntry instanceof Attribute) {
                        isAttribute = true;
                        token = paramEntry.attributeName;
                    }
                    else if (paramEntry instanceof Inject) {
                        token = paramEntry.token;
                    }
                    else if (isValidType(paramEntry) && isBlank(token)) {
                        token = paramEntry;
                    }
                });
            }
            else {
                token = param;
            }
            if (isBlank(token)) {
                hasUnknownDeps = true;
                return null;
            }
            return {
                isAttribute,
                isHost,
                isSelf,
                isSkipSelf,
                isOptional,
                token: this._getTokenMetadata(token)
            };
        });
        if (hasUnknownDeps) {
            const /** @type {?} */ depsTokens = dependenciesMetadata.map((dep) => dep ? stringify(dep.token) : '?').join(', ');
            this._reportError(new Error(`Can't resolve all parameters for ${stringify(typeOrFunc)}: (${depsTokens}).`), typeOrFunc);
        }
        return dependenciesMetadata;
    }
    /**
     * @param {?} token
     * @return {?}
     */
    _getTokenMetadata(token) {
        token = resolveForwardRef(token);
        let /** @type {?} */ compileToken;
        if (typeof token === 'string') {
            compileToken = { value: token };
        }
        else {
            compileToken = { identifier: { reference: token } };
        }
        return compileToken;
    }
    /**
     * @param {?} providers
     * @param {?} targetEntryComponents
     * @param {?=} debugInfo
     * @param {?=} compileProviders
     * @param {?=} type
     * @return {?}
     */
    _getProvidersMetadata(providers, targetEntryComponents, debugInfo, compileProviders = [], type) {
        providers.forEach((provider, providerIdx) => {
            if (Array.isArray(provider)) {
                this._getProvidersMetadata(provider, targetEntryComponents, debugInfo, compileProviders);
            }
            else {
                provider = resolveForwardRef(provider);
                let /** @type {?} */ providerMeta;
                if (provider && typeof provider == 'object' && provider.hasOwnProperty('provide')) {
                    providerMeta = new cpl.ProviderMeta(provider.provide, provider);
                }
                else if (isValidType(provider)) {
                    providerMeta = new cpl.ProviderMeta(provider, { useClass: provider });
                }
                else {
                    const /** @type {?} */ providersInfo = ((providers.reduce((soFar, seenProvider, seenProviderIdx) => {
                        if (seenProviderIdx < providerIdx) {
                            soFar.push(`${stringify(seenProvider)}`);
                        }
                        else if (seenProviderIdx == providerIdx) {
                            soFar.push(`?${stringify(seenProvider)}?`);
                        }
                        else if (seenProviderIdx == providerIdx + 1) {
                            soFar.push('...');
                        }
                        return soFar;
                    }, [])))
                        .join(', ');
                    this._reportError(new Error(`Invalid ${debugInfo ? debugInfo : 'provider'} - only instances of Provider and Type are allowed, got: [${providersInfo}]`), type);
                }
                if (providerMeta.token === resolveIdentifier(Identifiers.ANALYZE_FOR_ENTRY_COMPONENTS)) {
                    targetEntryComponents.push(...this._getEntryComponentsFromProvider(providerMeta, type));
                }
                else {
                    compileProviders.push(this.getProviderMetadata(providerMeta));
                }
            }
        });
        return compileProviders;
    }
    /**
     * @param {?} provider
     * @param {?=} type
     * @return {?}
     */
    _getEntryComponentsFromProvider(provider, type) {
        const /** @type {?} */ components = [];
        const /** @type {?} */ collectedIdentifiers = [];
        if (provider.useFactory || provider.useExisting || provider.useClass) {
            this._reportError(new Error(`The ANALYZE_FOR_ENTRY_COMPONENTS token only supports useValue!`), type);
            return [];
        }
        if (!provider.multi) {
            this._reportError(new Error(`The ANALYZE_FOR_ENTRY_COMPONENTS token only supports 'multi = true'!`), type);
            return [];
        }
        extractIdentifiers(provider.useValue, collectedIdentifiers);
        collectedIdentifiers.forEach((identifier) => {
            if (this._directiveResolver.isDirective(identifier.reference)) {
                components.push(identifier);
            }
        });
        return components;
    }
    /**
     * @param {?} provider
     * @return {?}
     */
    getProviderMetadata(provider) {
        let /** @type {?} */ compileDeps;
        let /** @type {?} */ compileTypeMetadata = null;
        let /** @type {?} */ compileFactoryMetadata = null;
        let /** @type {?} */ token = this._getTokenMetadata(provider.token);
        if (provider.useClass) {
            compileTypeMetadata = this._getTypeMetadata(provider.useClass, provider.dependencies);
            compileDeps = compileTypeMetadata.diDeps;
            if (provider.token === provider.useClass) {
                // use the compileTypeMetadata as it contains information about lifecycleHooks...
                token = { identifier: compileTypeMetadata };
            }
        }
        else if (provider.useFactory) {
            compileFactoryMetadata = this._getFactoryMetadata(provider.useFactory, provider.dependencies);
            compileDeps = compileFactoryMetadata.diDeps;
        }
        return {
            token: token,
            useClass: compileTypeMetadata,
            useValue: provider.useValue,
            useFactory: compileFactoryMetadata,
            useExisting: provider.useExisting ? this._getTokenMetadata(provider.useExisting) : null,
            deps: compileDeps,
            multi: provider.multi
        };
    }
    /**
     * @param {?} queries
     * @param {?} isViewQuery
     * @param {?} directiveType
     * @return {?}
     */
    _getQueriesMetadata(queries, isViewQuery, directiveType) {
        const /** @type {?} */ res = [];
        Object.keys(queries).forEach((propertyName) => {
            const /** @type {?} */ query = queries[propertyName];
            if (query.isViewQuery === isViewQuery) {
                res.push(this._getQueryMetadata(query, propertyName, directiveType));
            }
        });
        return res;
    }
    /**
     * @param {?} selector
     * @return {?}
     */
    _queryVarBindings(selector) { return selector.split(/\s*,\s*/); }
    /**
     * @param {?} q
     * @param {?} propertyName
     * @param {?} typeOrFunc
     * @return {?}
     */
    _getQueryMetadata(q, propertyName, typeOrFunc) {
        let /** @type {?} */ selectors;
        if (typeof q.selector === 'string') {
            selectors =
                this._queryVarBindings(q.selector).map(varName => this._getTokenMetadata(varName));
        }
        else {
            if (!q.selector) {
                this._reportError(new Error(`Can't construct a query for the property "${propertyName}" of "${stringify(typeOrFunc)}" since the query selector wasn't defined.`), typeOrFunc);
            }
            selectors = [this._getTokenMetadata(q.selector)];
        }
        return {
            selectors,
            first: q.first,
            descendants: q.descendants, propertyName,
            read: q.read ? this._getTokenMetadata(q.read) : null
        };
    }
    /**
     * @param {?} error
     * @param {?=} type
     * @param {?=} otherType
     * @return {?}
     */
    _reportError(error, type, otherType) {
        if (this._errorCollector) {
            this._errorCollector(error, type);
            if (otherType) {
                this._errorCollector(error, otherType);
            }
        }
        else {
            throw error;
        }
    }
}
CompileMetadataResolver.decorators = [
    { type: Injectable },
];
/** @nocollapse */
CompileMetadataResolver.ctorParameters = () => [
    { type: NgModuleResolver, },
    { type: DirectiveResolver, },
    { type: PipeResolver, },
    { type: SummaryResolver, },
    { type: ElementSchemaRegistry, },
    { type: DirectiveNormalizer, },
    { type: ReflectorReader, },
    { type: undefined, decorators: [{ type: Optional }, { type: Inject, args: [ERROR_COLLECTOR_TOKEN,] },] },
];
function CompileMetadataResolver_tsickle_Closure_declarations() {
    /** @type {?} */
    CompileMetadataResolver.decorators;
    /**
     * @nocollapse
     * @type {?}
     */
    CompileMetadataResolver.ctorParameters;
    /** @type {?} */
    CompileMetadataResolver.prototype._directiveCache;
    /** @type {?} */
    CompileMetadataResolver.prototype._summaryCache;
    /** @type {?} */
    CompileMetadataResolver.prototype._pipeCache;
    /** @type {?} */
    CompileMetadataResolver.prototype._ngModuleCache;
    /** @type {?} */
    CompileMetadataResolver.prototype._ngModuleOfTypes;
    /** @type {?} */
    CompileMetadataResolver.prototype._ngModuleResolver;
    /** @type {?} */
    CompileMetadataResolver.prototype._directiveResolver;
    /** @type {?} */
    CompileMetadataResolver.prototype._pipeResolver;
    /** @type {?} */
    CompileMetadataResolver.prototype._summaryResolver;
    /** @type {?} */
    CompileMetadataResolver.prototype._schemaRegistry;
    /** @type {?} */
    CompileMetadataResolver.prototype._directiveNormalizer;
    /** @type {?} */
    CompileMetadataResolver.prototype._reflector;
    /** @type {?} */
    CompileMetadataResolver.prototype._errorCollector;
}
/**
 * @param {?} tree
 * @param {?=} out
 * @return {?}
 */
function flattenArray(tree, out = []) {
    if (tree) {
        for (let /** @type {?} */ i = 0; i < tree.length; i++) {
            const /** @type {?} */ item = resolveForwardRef(tree[i]);
            if (Array.isArray(item)) {
                flattenArray(item, out);
            }
            else {
                out.push(item);
            }
        }
    }
    return out;
}
/**
 * @param {?} array
 * @return {?}
 */
function dedupeArray(array) {
    if (array) {
        return Array.from(new Set(array));
    }
    return [];
}
/**
 * @param {?} tree
 * @return {?}
 */
function flattenAndDedupeArray(tree) {
    return dedupeArray(flattenArray(tree));
}
/**
 * @param {?} value
 * @return {?}
 */
function isValidType(value) {
    return (value instanceof StaticSymbol) || (value instanceof Type);
}
/**
 * @param {?} reflector
 * @param {?} type
 * @param {?} cmpMetadata
 * @return {?}
 */
export function componentModuleUrl(reflector, type, cmpMetadata) {
    if (type instanceof StaticSymbol) {
        return type.filePath;
    }
    const /** @type {?} */ moduleId = cmpMetadata.moduleId;
    if (typeof moduleId === 'string') {
        const /** @type {?} */ scheme = getUrlScheme(moduleId);
        return scheme ? moduleId : `package:${moduleId}${MODULE_SUFFIX}`;
    }
    else if (moduleId !== null && moduleId !== void 0) {
        throw new Error(`moduleId should be a string in "${stringify(type)}". See https://goo.gl/wIDDiL for more information.\n` +
            `If you're using Webpack you should inline the template and the styles, see https://goo.gl/X2J8zc.`);
    }
    return reflector.importUri(type);
}
/**
 * @param {?} value
 * @param {?} targetIdentifiers
 * @return {?}
 */
function extractIdentifiers(value, targetIdentifiers) {
    visitValue(value, new _CompileValueConverter(), targetIdentifiers);
}
class _CompileValueConverter extends ValueTransformer {
    /**
     * @param {?} value
     * @param {?} targetIdentifiers
     * @return {?}
     */
    visitOther(value, targetIdentifiers) {
        targetIdentifiers.push({ reference: value });
    }
}
//# sourceMappingURL=metadata_resolver.js.map