/**
 * A token representing the a reference to a static type.
 *
 * This token is unique for a filePath and name and can be used as a hash table key.
 */
export class StaticSymbol {
    /**
     * @param {?} filePath
     * @param {?} name
     * @param {?=} members
     */
    constructor(filePath, name, members) {
        this.filePath = filePath;
        this.name = name;
        this.members = members;
    }
}
function StaticSymbol_tsickle_Closure_declarations() {
    /** @type {?} */
    StaticSymbol.prototype.filePath;
    /** @type {?} */
    StaticSymbol.prototype.name;
    /** @type {?} */
    StaticSymbol.prototype.members;
}
//# sourceMappingURL=static_symbol.js.map