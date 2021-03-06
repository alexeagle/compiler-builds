/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { tokenReference } from '../compile_metadata';
/**
 * @param {?} ce
 * @return {?}
 */
export function bindQueryValues(ce) {
    const /** @type {?} */ queriesWithReads = [];
    ce.getProviderTokens().forEach((token) => {
        const /** @type {?} */ queriesForProvider = ce.getQueriesFor(token);
        queriesWithReads.push(...queriesForProvider.map(query => new _QueryWithRead(query, token)));
    });
    Object.keys(ce.referenceTokens).forEach(varName => {
        const /** @type {?} */ varToken = { value: varName };
        queriesWithReads.push(...ce.getQueriesFor(varToken).map(query => new _QueryWithRead(query, varToken)));
    });
    queriesWithReads.forEach((queryWithRead) => {
        let /** @type {?} */ value;
        if (queryWithRead.read.identifier) {
            // query for an identifier
            value = ce.instances.get(tokenReference(queryWithRead.read));
        }
        else {
            // query for a reference
            const /** @type {?} */ token = ce.referenceTokens[queryWithRead.read.value];
            if (token) {
                value = ce.instances.get(tokenReference(token));
            }
            else {
                value = ce.elementRef;
            }
        }
        if (value) {
            queryWithRead.query.addValue(value, ce.view);
        }
    });
}
class _QueryWithRead {
    /**
     * @param {?} query
     * @param {?} match
     */
    constructor(query, match) {
        this.query = query;
        this.read = query.meta.read || match;
    }
}
function _QueryWithRead_tsickle_Closure_declarations() {
    /** @type {?} */
    _QueryWithRead.prototype.read;
    /** @type {?} */
    _QueryWithRead.prototype.query;
}
//# sourceMappingURL=query_binder.js.map