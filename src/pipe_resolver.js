/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable, Pipe, resolveForwardRef } from '@angular/core/index';
import { ListWrapper } from './facade/collection';
import { isPresent, stringify } from './facade/lang';
import { ReflectorReader, reflector } from './private_import_core';
/**
 * @param {?} type
 * @return {?}
 */
function _isPipeMetadata(type) {
    return type instanceof Pipe;
}
/**
 * Resolve a `Type` for {\@link Pipe}.
 *
 * This interface can be overridden by the application developer to create custom behavior.
 *
 * See {\@link Compiler}
 */
export class PipeResolver {
    /**
     * @param {?=} _reflector
     */
    constructor(_reflector = reflector) {
        this._reflector = _reflector;
    }
    /**
     * @param {?} type
     * @return {?}
     */
    isPipe(type) {
        const /** @type {?} */ typeMetadata = this._reflector.annotations(resolveForwardRef(type));
        return typeMetadata && typeMetadata.some(_isPipeMetadata);
    }
    /**
     * Return {\@link Pipe} for a given `Type`.
     * @param {?} type
     * @param {?=} throwIfNotFound
     * @return {?}
     */
    resolve(type, throwIfNotFound = true) {
        const /** @type {?} */ metas = this._reflector.annotations(resolveForwardRef(type));
        if (isPresent(metas)) {
            const /** @type {?} */ annotation = ListWrapper.findLast(metas, _isPipeMetadata);
            if (isPresent(annotation)) {
                return annotation;
            }
        }
        if (throwIfNotFound) {
            throw new Error(`No Pipe decorator found on ${stringify(type)}`);
        }
        return null;
    }
}
PipeResolver.decorators = [
    { type: Injectable },
];
/** @nocollapse */
PipeResolver.ctorParameters = () => [
    { type: ReflectorReader, },
];
function PipeResolver_tsickle_Closure_declarations() {
    /** @type {?} */
    PipeResolver.decorators;
    /**
     * @nocollapse
     * @type {?}
     */
    PipeResolver.ctorParameters;
    /** @type {?} */
    PipeResolver.prototype._reflector;
}
//# sourceMappingURL=pipe_resolver.js.map